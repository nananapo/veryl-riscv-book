= RV32Iの実装

本章では、RISC-Vの基本整数命令セットである@<code>{RV32I}を実装します。
基本整数命令という名前の通り、整数の足し引きやビット演算、ジャンプ、分岐命令などの最小限の命令しか実装されていません。
また、32ビット幅の汎用レジスタが32個定義されています。
ただし、0番目のレジスタの値は常に0です。
RISC-Vは基本整数命令セットに新しい命令を拡張として実装します。
複雑な機能を持つCPUを実装する前に、まずは最小の機能を持つCPUを実装しましょう。

== CPUは何をやっているのか？

上に書かれている文章の意味が分からなくても大丈夫。
詳しく説明します。

CPUを実装するには何が必要でしょうか？
まずはCPUがどのような動作をするかについて考えてみます。
一般的に、汎用のプログラムを実行するCPUは次の手順でプログラムを実行していきます。

 1. メモリからプログラムを読み込む
 2. プログラムを実行する
 3. 1, 2の繰り返し

ここで、メモリから読み込まれる「プログラム」とは一体何を示しているのでしょうか？
普通のプログラマが書くのはC言語やRustなどのプログラミング言語のプログラムですが、
通常のCPUはそれをそのまま解釈して実行することはできません。
そのため、メモリから読み込まれる「プログラム」とは、
CPUが読み込んで実行することができる形式のプログラムです。
これはよく「機械語」と呼ばれ、0と1で表される2進数のビット列で記述されています。

メモリからプログラムを読み込んで実行するのがCPUの仕事ということが分かりました。
これをもう少し掘り下げます。

まず、プログラムをメモリから読み込むためには、
メモリのどこを読み込みたいのかという情報(アドレス)をメモリに与える必要があります。
また、当然ながらメモリが必要です。

CPUはプログラムを実行しますが、
一気にすべてのプログラムを読み込んだり実行するわけではなく、
プログラムの最小単位である「命令」を一つずつ読み込んで実行します。
命令をメモリに要求、取得することを、命令をフェッチするといいます。

命令がCPUに供給されると、CPUは命令のビット列がどのような意味を持っていて何をすればいいかを判定します。
このことを、命令をデコードするといいます。

命令をデコードすると、いよいよ計算やメモリアクセスを行います。
しかし、例えば足し算を計算するにも何と何を足し合わせればいいのか分かりません。
この計算に使うデータは、次のように指定されます。

 * レジスタ(= CPUに存在する小さなメモリ)の番号
 * 即値(= 命令のビット列から生成される数値)

計算対象のデータにレジスタと即値のどれを使うかは命令によって異なります。
レジスタの番号は命令のビット列の中に含まれています。

計算を実行するユニット(部品)のことを、ALU(Arithmetic Logic Unit)といいます。

計算やメモリアクセスが終わると、その結果をレジスタに格納します。
例えば足し算を行う命令なら足し算の結果が、
メモリから値を読み込む命令なら読み込まれた値が格納されます。

これで命令の実行は終わりですが、CPUは次の命令を実行する必要があります。
今現在実行している命令のアドレスを格納しているメモリのことをプログラムカウンタ(PC)と言い、
CPUはPCの値をメモリに渡すことで命令をフェッチしています。
CPUは次の命令を実行するために、PCの値を次の命令のアドレスに設定します。
ジャンプ命令の場合は、PCの値をジャンプ先のアドレスに設定します。
分岐命令の場合は、分岐の成否を計算で判定し、分岐が成立する場合は分岐先のアドレスをPCに設定します。
分岐が成立しない場合は、通常の命令と同じように次の命令のアドレスをPCに設定します。

ここまでの話をまとめると、CPUの動作は次のようになります。

 * PCに格納されたアドレスにある命令をフェッチする
 * 命令を取得したらデコードする
 * 計算で使用するデータを取得する (レジスタの値を取得したり、即値を生成する)
 * 計算する命令の場合、計算を行う
 * メモリにアクセスする命令の場合、メモリ操作を行う
 * 計算やメモリアクセスの結果をレジスタに格納する
 * PCの値を次に実行する命令に設定する

CPUが何をするものなのかが分かりましたか？
実装を始めましょう。

== プロジェクトの作成

まず、Verylのプロジェクトを作成します。
ここでは適当にcoreという名前にしています。

//terminal[veryl-new][新規プロジェクトの作成]{
$ @<userinput>{veryl new core}
[INFO ]      Created "core" project
//}

すると、プロジェクト名のフォルダと、その中にVeryl.tomlが作成されます。

TODO ソースマップがいらないので消す

//list[Veryl.toml.first][作成されたVeryl.toml]{
[project]
name = "core"
version = "0.1.0"
//}

Verylのプログラムを格納するために、プロジェクトのフォルダ内にsrcフォルダを作成しておいてください。
//terminal[][]{
$ @<userinput>{cd core}
$ @<userinput>{mkdir src}
//}

== 定数の定義

いよいよプログラムを記述していきます。
まず、CPU内で何度も使用する定数や型を記述するパッケージを作成します。

@<code>{src/eei.veryl}を作成し、次のように記述します。

//list[eei.veryl][eei.veryl]{
#@mapfile(scripts/04/eei-param/core/src/eei.veryl)
package eei {
    const XLEN: u32 = 32;
    const ILEN: u32 = 32;

    type UIntX  = logic<XLEN>;
    type UInt32 = logic<32>  ;
    type UInt64 = logic<64>  ;
    type Inst   = logic<ILEN>;
    type Addr   = logic<XLEN>;
}
#@end
//}

EEIとは、RISC-V execution environment interfaceの略です。
RISC-Vのプログラムの実行環境とインターフェースという広い意味があり、
ISAの定義もEEIに含まれているため名前を使用しています。

eeiパッケージには、次のパラメータを定義します。

 : XLEN
    XLENは、RISC-Vにおいて整数レジスタの長さを示す数字として定義されています。
    RV32Iのレジスタの長さは32ビットであるため、値を32にしています。
 : ILEN
    ILENは、RISC-VにおいてCPUの実装がサポートする命令の最大の幅を示す値として定義されています。
    RISC-Vの命令の幅は、後の章で説明する圧縮命令を除けばすべて32ビットです。
    そのため、値を32にしています。

また、何度も使用することになる型に別名を付けています。

 : UIntX, UInt32, UInt64
    幅がそれぞれXLEN, 32, 64の符号なし整数型
 : Inst
    命令のビット列を格納するための型
 : Addr
    メモリのアドレスを格納するための型。
    RISC-Vで使用できるメモリ空間の幅はXLENなのでUIntXでもいいですが、アドレスであることを明示するために別名を定義しています。

== メモリ

CPUはメモリに格納された命令を実行します。
よって、CPUの実装のためにはメモリの実装が必要です。
RV32Iにおいて命令の幅は32ビットです。
また、メモリからのロード命令、ストア命令の最大の幅も32ビットです。

これを実現するために、次のような要件のメモリを実装します。

 * 読み書きの単位は32ビット
 * クロックに同期してメモリアクセスの要求を受け取る
 * 要求を受け取った次のクロックで結果を返す

=== メモリのインターフェースの定義

このメモリモジュールには、クロックとリセット信号の他に7個のポートを定義する必要があります(@<table>{memmodule-if})。
これを一つ一つ定義、接続するのは面倒なため、次のようなinterfaceを定義します。

@<code>{src/membus_if.veryl}を作成し、次のように記述します。

//list[membus_if.veryl][インターフェースの定義(membus_if.veryl)]{
#@mapfile(scripts/04/memif/core/src/membus_if.veryl)
import eei::*;

interface membus_if {
    var valid : logic ;
    var ready : logic ;
    var addr  : Addr  ;
    var wen   : logic ;
    var wdata : UInt32;
    var rvalid: logic ;
    var rdata : UInt32;

    modport master {
        valid : output,
        ready : input ,
        addr  : output,
        wen   : output,
        wdata : output,
        rvalid: input ,
        rdata : input ,
    }

    modport slave {
        valid : input ,
        ready : output,
        addr  : input ,
        wen   : input ,
        wdata : input ,
        rvalid: output,
        rdata : output,
    }
}
#@end
//}

//table[memmodule-if][メモリモジュールに必要なポート]{
ポート名	型		向き	意味
-------------------------------------------------------------
clk			clock	input	クロック信号
rst 		reset	input	リセット信号
valid		logic	input	メモリアクセスを要求しているかどうか
ready		logic	output	メモリアクセスを受容するかどうか
addr		Addr	input	アクセスするアドレス
wen			logic	input	書き込みかどうか (1なら書き込み)
wdata		UInt32	input	書き込むデータ
rvalid		logic	output	受容した要求の処理が終了したかどうか
rdata		UInt32	output	受容した読み込み命令の結果
//}

interfaceを利用することで、レジスタやワイヤの定義が不要になり、さらにポートの相互接続を簡潔にすることができます。

=== メモリの実装

メモリを作る準備が整いました。
@<code>{src/memory.veryl}を作成し、その中にメモリモジュールを記述します。

//list[memory.veryl][memory.veryl]{
#@mapfile(scripts/04/memif/core/src/memory.veryl)
import eei::*;

module memory #(
    param MEMORY_WIDTH: u32 = 20, // メモリのサイズ
) (
    clk      : input   clock           ,
    rst      : input   reset           ,
    membus   : modport membus_if::slave,
    FILE_PATH: input   string          , // メモリの初期値が格納されたファイルのパス
) {

    var mem: UInt32 [2 ** MEMORY_WIDTH];

    // Addrをmemのインデックスに変換する関数
    function addr_to_memaddr (
        addr: input Addr               ,
    ) -> logic<MEMORY_WIDTH> {
        return addr[MEMORY_WIDTH - 1 + 2:2];
    }

    initial {
        // memをFILE_PATHに格納されているデータで初期化
        if FILE_PATH != "" {
            $readmemh(FILE_PATH, mem);
        }
    }

    always_comb {
        membus.ready = 1;
    }

    always_ff {
        membus.rvalid = membus.valid;
        membus.rdata  = mem[addr_to_memaddr(membus.addr)];
        if membus.valid && membus.wen {
            mem[addr_to_memaddr(membus.addr)] = membus.wdata;
        }
    }
}
#@end
//}

memoryモジュールには次のパラメータが定義されています。

 : MEMORY_WIDTH
	メモリのサイズを指定するためのパラメータです。
	メモリのサイズは32ビット * (2 ** MEMORY_WIDTH)になります。

 : FILE_PATH
    メモリの初期値が格納されたファイルのパスです。
    初期化は$readmemhシステムタスクで行います。
    (ポートとして定義していますが、本書ではパラメータとして扱います。)

読み込み、書き込み時の動作は次の通りです。

 : 読み込み
	読み込みが要求されるとき、
	@<code>{membus.valid}が@<code>{1}、
	@<code>{membus.wen}が@<code>{0}、
	@<code>{membus.addr}が対象アドレスになっています。
	次のクロックで、@<code>{membus.rvalid}が@<code>{1}になり、
	@<code>{membus.rdata}はメモリのデータになります。

 : 書き込み
	読み込みが要求されるとき、
	@<code>{membus.valid}が@<code>{1}、
	@<code>{membus.wen}が@<code>{1}、
	@<code>{membus.addr}が対象アドレスになっています。
	@<code>{always_ff}ブロックでは、
	@<code>{membus.wen}が@<code>{1}であることを確認し、
	@<code>{1}の場合は対象アドレスに@<code>{membus.wdata}を書き込みます。
	次のクロックで@<code>{membus.rvalid}が@<code>{1}になります。

Addr型では1バイト単位でアドレスを指定しますが、
memレジスタは32ビット(=4バイト)単位でデータを整列しています。
そのため、Addr型のアドレスをそのままmemレジスタのインデックスとして利用することはできません。
@<code>{addr_to_memaddr}関数は、
1バイト単位のアドレスの下位2ビットを切り詰めることによって、
memレジスタにおけるインデックスに変換しています。

== topモジュールの作成

次に、最上位のモジュールを定義します。

//list[top.veryl.memory.inst][top.veryl]{
#@mapfile(scripts/04/memif/core/src/top.veryl)
import eei::*;

module top (
    clk          : input clock ,
    rst          : input reset ,
    MEM_FILE_PATH: input string,
) {
    inst membus: membus_if;

    inst mem: memory (
        clk                     ,
        rst                     ,
        membus                  ,
        FILE_PATH: MEM_FILE_PATH,
    );
}
#@end
//}

先ほど作ったmemoryモジュールをインスタンス化しています。
また、memoryモジュールのポートに接続するためのmembus_ifインターフェースもインスタンス化しています。

== 命令フェッチ

メモリを作成したため、命令フェッチ処理を作る準備が整いました。
いよいよCPUのメイン部分を作成していきます。

=== 命令フェッチの実装

@<code>{src/core.veryl}を作成し、次のように記述します。

//list[core.veryl.all][core.veryl]{
#@mapfile(scripts/04/create-core/core/src/core.veryl)
import eei::*;

module core (
    clk   : input   clock            ,
    rst   : input   reset            ,
    membus: modport membus_if::master,
) {

    var if_pc          : Addr ;
    var if_is_requested: logic; // フェッチ中かどうか
    var if_pc_requested: Addr ; // 要求したアドレス

    let if_pc_next: Addr = if_pc + 4;

    // 命令フェッチ処理
    always_comb {
        membus.valid = 1;
        membus.addr  = if_pc;
        membus.wen   = 0;
        membus.wdata = 'x; // wdataは使用しない
    }

    always_ff {
        if_reset {
            if_pc           = 0;
            if_is_requested = 0;
            if_pc_requested = 0;
        } else {
            if if_is_requested {
                if membus.rvalid {
                    if_is_requested = membus.ready;
                    if membus.ready {
                        if_pc           = if_pc_next;
                        if_pc_requested = if_pc;
                    }
                }
            } else {
                if membus.ready {
                    if_is_requested = 1;
                    if_pc           = if_pc_next;
                    if_pc_requested = if_pc;
                }
            }
        }
    }

    always_ff {
        if if_is_requested && membus.rvalid {
            $display("%h : %h", if_pc_requested, membus.rdata);
        }
    }
}
#@end
//}

@<code>{if_pc}レジスタはPC(プログラムカウンタ)です。
ここで@<code>{if_}というprefixはinstruction fetchの略です。
@<code>{if_is_requested}で現在フェッチ中かどうかを管理しており、
フェッチ中のアドレスを@<code>{if_pc_requested}に格納しています。

@<code>{always_comb}ブロックでは、常にメモリにアドレス@<code>{if_pc}にある命令を要求しています。
命令フェッチではメモリの読み込みしか行わないため、@<code>{membus.wen}は@<code>{0}になっています。

上から1つめの@<code>{always_ff}ブロックでは、
フェッチ中かどうか、メモリはready(要求を受け入れる)状態かどうかによって、
@<code>{if_pc}, @<code>{if_is_requested}, @<code>{if_pc_requested}の値を変更しています。
メモリに新しくフェッチを要求する時、
@<code>{if_pc}を次の命令のアドレス(@<code>{4}を足したアドレス)に、
@<code>{if_is_requested}を@<code>{1}に変更しています。
フェッチ中かつ@<code>{membus.rvalid}が@<code>{1}のときは命令フェッチが完了しています。
その場合は、メモリがreadyならすぐに次の命令フェッチを開始します。

これにより、0,4,8,c,10,...という順番のアドレスの命令を次々にフェッチするようになっています。

上から2つめの@<code>{always_ff}ブロックはデバッグ用のプログラムです。
命令フェッチが完了したときにその結果を@<code>{$display}システムタスクによって出力します。

次に、topモジュールでcoreモジュールをインスタンス化し、membus_ifインターフェースを接続します。
これによって、メモリとCPUが接続されました。

//list[top.veryl.core.instantiate][top.veryl内でcoreモジュールをインスタンス化する]{
#@mapoutput(tail scripts/04/create-core/core/src/top.veryl -n 6 | head -n 5)
    inst c: core (
        clk     ,
        rst     ,
        membus  ,
    );
#@end
//}

=== 命令フェッチのテスト

ここまでのプログラムが正しく動くかを検証します。

Verylで記述されたプログラムは@<code>{veryl build}コマンドでSystemVerilogのプログラムに変換することができます。
変換されたプログラムをオープンソースのVerilogシミュレータであるVerilatorで実行することで、命令フェッチが正しく動いていることを確認します。

まず、プログラムをビルドします。
//terminal[veryl.build.first][Verylプログラムのビルド]{
$ @<userinput>{veryl fmt} @<balloon>{フォーマットする}
$ @<userinput>{veryl build} @<balloon>{ビルドする}
//}

上記のコマンドを実行すると、verylプログラムと同名の@<code>{.sv}ファイルと@<code>{core.f}ファイルが生成されます。
@<code>{core.f}は生成されたSystemVerilogのプログラムファイルのリストです。
これをシミュレータのビルドに利用します。

シミュレータのビルドにはVerilatorを利用します。
Verilatorは与えられたSystemVerilogプログラムをC++プログラムに変換することでシミュレータを生成します。
verilatorを利用するために、次のようなC++プログラムを書く必要があります。

@<code>{src/tb_verilator.cpp}を作成し、次のように記述します。

//list[test_verilator.cpp][tb_verilator.cpp]{
#@mapfile(scripts/04/verilator-tb/core/src/tb_verilator.cpp)
#include <iostream>
#include <filesystem>
#include <verilated.h>
#include "Vcore_top.h"

namespace fs = std::filesystem;

int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);

    if (argc < 2) {
        std::cout << "Usage: " << argv[0] << " MEMORY_FILE_PATH [CYCLE]" << std::endl;
        return 1;
    }

    // メモリの初期値を格納しているファイル名
    std::string memory_file_path = argv[1];
    try {
        // 絶対パスに変換する
        fs::path absolutePath = fs::absolute(memory_file_path);
        memory_file_path = absolutePath.string();
    } catch (const std::exception& e) {
        std::cerr << "Invalid memory file path : " << e.what() << std::endl;
        return 1;
    }

    // シミュレーションを実行するクロックサイクル数
    unsigned long long cycles = 0;
    if (argc >= 3) {
        std::string cycles_string = argv[2];
        try {
            cycles = stoull(cycles_string);
        } catch (const std::exception& e) {
            std::cerr << "Invalid number: " << argv[2] << std::endl;
            return 1;
        }
    }

    Vcore_top *dut = new Vcore_top();
    dut->MEM_FILE_PATH = memory_file_path;

    // reset
    dut->clk = 0;
    dut->rst = 1;
    dut->eval();
    dut->rst = 0;
    dut->eval();

    // loop
    dut->rst = 1;
    for (long long i=0; cycles == 0 || i / 2 < cycles; i++) {
        dut->clk = !dut->clk;
        dut->eval();
    }

    dut->final();
}
#@end
//}

このC++プログラムはtopモジュール(プログラム中ではVtop_coreクラス)をインスタンス化し、
そのクロックを反転して実行するのを繰り返しています。

このプログラムはコマンドライン引数として次の2つの値を受け取ります。

 : MEMORY_FILE_PATH
	メモリの初期値のファイルへのパス。
	実行時にtopモジュールのMEM_FILE_PATHパラメータに渡されます。

 : CYCLE
	何クロックで実行を終了するかを表す値。
	0のときは終了しません。デフォルト値は0です。

Verilatorによるシミュレーションは、トップモジュールのクロック信号を変更して@<code>{eval}関数を呼び出すことにより実行します。
プログラムでは@<code>{clk}を反転させて@<code>{eval}するループの前にtopモジュールをリセットする必要があるため、
topモジュールの@<code>{rst}を1にして@<code>{eval}を実行し、
@<code>{rst}を0にしてまた@<code>{eval}を実行し、
@<code>{rst}を1にもどしてから@<code>{clk}を反転しています。

==== シミュレータのビルド

@<code>{verilator}コマンドを実行し、シミュレータをビルドします。

//terminal[build.simulator][シミュレータのビルド]{
$ verilator --cc -f core.f --exe src/tb_verialtor.cpp --top-module top --Mdir obj_dir
$ make -C obj_dir -f Vcore_top.mk @<balloon>{シミュレータをビルドする}
$ mv obj_dir/Vcore_top obj_dir/sim @<balloon>{シミュレータの名前をsimに変更する}
//}

@<code>{verilator --cc}コマンドに次のコマンドライン引数を渡して実行することで、
シミュレータを生成するためのプログラムが@<code>{obj_dir}に生成されます。

 : -f
	SystemVerilogプログラムのファイルリストを指定します。
	今回は@<code>{core.f}を指定しています。

 : --exe
	実行可能なシミュレータの生成に使用する、main関数が含まれたC++プログラムを指定します。
	今回は@<code>{src/tb_verilator.cpp}を指定しています。

 : --top-module
	トップモジュールを指定します。
	今回は@<code>{top}モジュールを指定しています。

 : --Mdir
	成果物の生成先を指定します。
	今回は@<code>{obj_dir}フォルダに指定しています。


上記のコマンドの実行により、シミュレータが@<code>{obj_dir/sim}に生成されました。

==== メモリの初期化用ファイルの作成

シミュレータを実行する前にメモリの初期値となるファイルを作成します。
@<code>{src/sample.hex}を作成し、次のように記述します。

//list[sample.hex][sample.hex]{
#@mapfile(scripts/04/memif/core/src/sample.hex)
01234567
89abcdef
deadbeef
cafebebe
#@end
@<balloon>{必ず末尾に改行をいれてください}
//}

値は16進数で4バイトずつ記述されています。
シミュレーションを実行すると、このファイルはmemoryモジュールの@<code>{$readmemh}システムタスクによって読み込みます。
それにより、メモリは次のように初期化されます。

//table[sample.hex.initial][sample.hexによって設定されるメモリの初期値]{
アドレス	値
-------------------------------------------------------------
00000000	01234567
00000004	89abcdef
00000008	deadbeef
0000000c	cafebebe
00000010~	不定
//}

==== シミュレータの実行

生成されたシミュレータを実行し、アドレスが0, 4, 8, cのデータが正しくフェッチされていることを確認します。

//terminal[check-memory][命令フェッチの動作チェック]{
$ obj_dir/sim src/sample.hex 4
00000000 : 01234567
00000004 : 89abcdef
00000008 : deadbeef
0000000c : cafebebe
//}

メモリファイルのデータが4バイトずつ読み込まれていることが確認できます。

==== Makefileの作成

ビルド、シミュレータのビルドのために一々コマンドを打つのは面倒です。
これらの作業を一つのコマンドで済ますために、@<code>{Makefile}を作成し、次のように記述します。

//list[Makefile][Makefile]{
#@mapfile(scripts/04/verilator-tb/core/Makefile)
PROJECT = core
FILELIST = $(PROJECT).f

TOP_MODULE = top
TB_PROGRAM = src/tb_verilator.cpp
OBJ_DIR = obj_dir/
SIM_NAME = sim

build:
        veryl fmt
        veryl build

clean:
        veryl clean
        rm -f src/*.sv.map
        rm -rf $(OBJ_DIR)

sim:
        verilator --cc -f $(FILELIST) --exe $(TB_PROGRAM) --top-module $(PROJECT)_$(TOP_MODULE) --Mdir $(OBJ_DIR)
        make -C $(OBJ_DIR) -f V$(PROJECT)_$(TOP_MODULE).mk
        mv $(OBJ_DIR)/V$(PROJECT)_$(TOP_MODULE) $(OBJ_DIR)/$(SIM_NAME)
#@end
//}

これ以降、次のようにビルドやシミュレータのビルドができるようになります。

//terminal[build.command][Makefileによって追加されたコマンド]{
$ @<userinput>{make build} @<balloon>{Verylプログラムのビルド}
$ @<userinput>{make sim} @<balloon>{シミュレータのビルド}
$ @<userinput>{make clean} @<balloon>{ビルドした成果物の削除}
//}

=== フェッチした命令をFIFOに格納する

==== FIFOの作成

フェッチした命令は次々に実行されますが、その命令が何クロックで実行されるかは分かりません。
命令が常に1クロックで実行される場合は現状の常にフェッチし続けるようなコードで問題ありませんが、
例えばメモリにアクセスする命令は実行に何クロックかかるか分からないため、
フェッチされた次の命令を保持しておくバッファを用意しておく必要があります。

そこで、FIFOを作成して、フェッチした命令を格納します。@<code>{src/fifo.veryl}を作成し、次のように記述します。

//list[fifo.veryl][fifo.veryl]{
#@mapfile(scripts/04/if-fifo/core/src/fifo.veryl)
module fifo #(
    param DATA_TYPE: type = logic,
    param WIDTH    : u32  = 2    ,
) (
    clk   : input  clock    ,
    rst   : input  reset    ,
    wready: output logic    ,
    wvalid: input  logic    ,
    wdata : input  DATA_TYPE,
    rready: input  logic    ,
    rvalid: output logic    ,
    rdata : output DATA_TYPE,
) {
    type Ptr = logic<WIDTH>;

    var mem : DATA_TYPE [2 ** WIDTH];
    var head: Ptr                   ;
    var tail: Ptr                   ;

    let tail_plus1: Ptr = tail + 1;

    always_comb {
        rvalid = head != tail;
        rdata  = mem[head];
        wready = tail_plus1 != head;
    }

    always_ff {
        if wready && wvalid {
            mem[tail] = wdata;
            tail      = tail + 1;
        }
        if rready && rvalid {
            head = head + 1;
        }
    }
}
#@end
//}

fifoモジュールは、@<code>{DATA_TYPE}型のデータを@<code>{2 ** WIDTH - 1}個格納することができるFIFOです。
操作は次のように行います。

 : データを追加する
    @<code>{wready}が@<code>{1}のとき、データを追加することができます。
    データを追加するためには、追加したいデータを@<code>{wdata}に格納し、@<code>{wvalid}を@<code>{1}にします。
    追加したデータは次のクロック以降に取り出すことができます。

 : データを取り出す
    @<code>{rready}が@<code>{1}のとき、データを取り出すことができます。
    データを取り出すことができるとき、@<code>{rdata}にデータが出力されています。
    @<code>{rvalid}を@<code>{1}にすることで、FIFOにデータを取り出したことを通知することができます。

@<code>{head}レジスタと@<code>{tail}レジスタによってデータの格納状況を管理しています。
データを書き込むとき、つまり@<code>{wready && wvalid}のとき、@<code>{tail = tail + 1}しています。
データを取り出すとき、つまり@<code>{rready && rvalid}のとき、@<code>{head = head + 1}しています。

データを書き込める状況とは、@<code>{tail}に1を足しても@<code>{head}を超えない、
つまり、@<code>{tail}が指す場所が一周してしまわないときです。
この制限から、FIFOには最大でも@<code>{2 ** WIDTH - 1}個しかデータを格納することができません。
データを取り出せる状況とは、@<code>{head}と@<code>{tail}の指す場所が違うときです。

==== 命令フェッチ処理の変更

fifoモジュールを使って、次のように命令フェッチ処理を変更します。

まず、fifoモジュールをインスタンス化します。

//list[if-fifo-inst][fifoモジュールのインスタンス化]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,inst_fifo)
    // ifのFIFOのデータ型
    struct if_fifo_type {
        addr: Addr,
        bits: Inst,
    }

    // FIFOの制御用レジスタ
    var if_fifo_wready: logic       ;
    var if_fifo_wvalid: logic       ;
    var if_fifo_wdata : if_fifo_type;
    var if_fifo_rready: logic       ;
    var if_fifo_rvalid: logic       ;
    var if_fifo_rdata : if_fifo_type;

    // フェッチした命令を格納するFIFO
    inst if_fifo: fifo #(
        DATA_TYPE: if_fifo_type,
        WIDTH    : 3           ,
    ) (
        clk                   ,
        rst                   ,
        wready: if_fifo_wready,
        wvalid: if_fifo_wvalid,
        wdata : if_fifo_wdata ,
        rready: if_fifo_rready,
        rvalid: if_fifo_rvalid,
        rdata : if_fifo_rdata ,
    );
#@end
//}

まず、FIFOに入れるデータの型として@<code>{if_fifo_type}という構造体を定義します。
@<code>{if_fifo_type}には、命令のアドレス(@<code>{addr})と命令のビット列(@<code>{bits})を格納するためのメンバーが含まれています。

次に、fifoモジュールとデータの受け渡しをするための変数を定義し、fifoモジュールを@<code>{if_fifo}という名前でインスタンス化しています。
@<code>{DATA_TYPE}パラメータに@<code>{if_fifo_type}を渡すことでアドレスと命令のペアを格納することができるようにし、
@<code>{WIDTH}に@<code>{3}と指定することで、サイズを@<code>{2 ** 3 - 1 = 7}にしています。
このサイズは適当です。

fifoモジュールを用意したので、メモリへフェッチ指令を送る処理を変更します。

//list[change-fetch-if][フェッチ処理の変更]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,fetch)
    // 命令フェッチ処理
    always_comb {
        // FIFOに空きがあるとき、命令をフェッチする
        membus.valid = if_fifo_wready; @<balloon>{1をif_fifo_wreadyに変更}
        membus.addr  = if_pc;
        membus.wen   = 0;
        membus.wdata = 'x; // wdataは使用しない

        // 常にFIFOから命令を受け取る
        if_fifo_rready = 1;
    }
#@end
//}

上のコードでは、メモリに命令フェッチを要求する条件を、
FIFOに空きがあるという条件に変更しています。
これにより、FIFOがあふれてしまうことがなくなります。
また、とりあえずFIFOから常にデータを取り出すようにしています。

次に、命令をフェッチできたらFIFOに格納するようにします。

//list[fifo_ctrl][FIFOへのデータの格納]{
    always_ff {
            ...
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,fifo_ctrl)
            // IFのFIFOの制御
            if if_is_requested && membus.rvalid { @<balloon>{フェッチできた時}
                if_fifo_wvalid     = 1;
                if_fifo_wdata.addr = if_pc_requested;
                if_fifo_wdata.bits = membus.rdata;
            } else {
                if if_fifo_wvalid && if_fifo_wready { @<balloon>{FIFOにデータを格納できる時}
                    if_fifo_wvalid = 0;
                }
            }
#@end
//}

上のコードを@<code>{always_ff}ブロックの中に追加します。
また、@<code>{if_fifo_wvalid}と@<code>{if_fifo_wdata}を@<code>{if_reset}内で0に初期化してください。

フェッチができた時、@<code>{if_fifo_wvalid}レジスタの値を@<code>{1}にして、
@<code>{if_fifo_wdata}レジスタにフェッチした命令とアドレスを格納します。
これにより、次のクロック以降のFIFOに空きがあるタイミングでデータが追加されます。

それ以外の時、FIFOにデータを格納しようとしていてFIFOに空きがあるとき、
@<code>{if_fifo_wvalid}を@<code>{0}にすることでデータの追加を完了します。

命令フェッチはFIFOに空きがあるときにのみ行うため、
まだ追加されていないデータが@<code>{if_fifo_wdata}レジスタに格納されていても別のデータに上書きされてしまうことはありません。

//list[fifo-debug][命令を表示する]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,debug)
    let inst_pc  : Addr = if_fifo_rdata.addr;
    let inst_bits: Inst = if_fifo_rdata.bits;

    always_ff {
        if if_fifo_rvalid {
            $display("%h : %h", inst_pc, inst_bits);
        }
    }
#@end
//}

命令を表示するコードを上のように変更し、シミュレータを実行しましょう。
命令がフェッチされて表示されるまでに、FIFOに格納して取り出すクロック分だけ遅延があることに注意してください。

//terminal[sim-fifo][FIFOをテストする]{
$ make build sim
$ obj_dir/sim src/sample.hex 7
00000000 : 01234567
00000004 : 89abcdef
00000008 : deadbeef
0000000c : cafebebe
//}

== 命令のデコードと即値の生成

命令をフェッチすることができたら、
フェッチした命令がどのような意味を持つかをチェックし、
CPUが何をすればいいかを判断するためのフラグや値を生成します。
この作業のことを、命令のデコードと呼びます。

RISC-Vにはいくつかの命令の形式がありますが、RV32IにはR, I, S, B, U, Jの6つの形式の命令が存在しています。

//image[riscv-inst-types][RISC-Vの命令形式 (引用元: The RISC-V Instruction Set Manual Volume I: Unprivileged Architecture version 20240411 2.3. Immediate Encoding Variants)]{
//}

 : R形式
	ソースレジスタ(rs1, rs2)が2つ、デスティネーションレジスタ(rd)が1つの命令形式です。
	2つのソースレジスタの値を使って計算し、その結果をデスティネーションレジスタに格納します。
	例えばADD, SUB命令に使用されています。

 : I形式
	ソースレジスタ(rs1)が1つ、デスティネーションレジスタ(rd)が1つの命令形式です。
	12ビットの即値(@<code>{imm[11:0]})が命令中に含まれており、これとrs1を使って計算し、
	その結果をデスティネーションレジスタに格納します。
	例えばADDI, SUBI命令に使用されています。

 : S形式
	ソースレジスタ(rs1, rs2)が2つ、デスティネーションレジスタ(rd)が1つの命令形式です。
	12ビットの即値(@<code>{imm{11:5], imm[4:0]})が命令中に含まれており、
	これとソースレジスタを使って計算やメモリにアクセスし、
	その結果をデスティネーションレジスタに格納します。
	例えばSW命令(メモリにデータを格納する命令)に使用されています。

 : B形式
	ソースレジスタ(rs1, rs2)が2つの命令形式です。
	12ビットの即値(@<code>{imm[12], imm[11], imm[10:5], imm[4:1]})が命令中に含まれています。
	分岐命令に使用されており、
	ソースレジスタの計算の結果が分岐を成立させる場合、
	即値を使ってジャンプします。

 : U形式
	デスティネーションレジスタ(rd)が1つの命令形式です。
	20ビットの即値(@<code>{imm[31:12]})が命令中に含まれています。
	例えばLUI命令(レジスタの上位20ビットを設定する命令)に使用されています。

 : J形式
	デスティネーションレジスタ(rd)が1つの命令形式です。
	20ビットの即値(@<code>{imm[20], imm[19:12], imm[11], imm[10:1]})が命令中に含まれています。
	例えばJAL命令(ジャンプ命令)に使用されており、
	PCに即値を足した相対位置にジャンプします。

全ての命令形式には@<code>{opcode}が共通して存在しています。
命令の判別には@<code>{opcode}、@<code>{funct3}、@<code>{funct7}を利用します。

=== 定数と型の定義

デコード処理を書く前に、デコードに利用する定数と型を定義します。
@<code>{src/corectrl.veryl}を作成し、次のように記述します。

//list[ctrl.veryl.decode][corectrl.veryl]{
#@mapfile(scripts/04/id/core/src/corectrl.veryl)
import eei::*;

package corectrl {
    // 命令形式を表す列挙型
    enum InstType: logic<6> {
        X = 6'b000000,
        R = 6'b000001,
        I = 6'b000010,
        S = 6'b000100,
        B = 6'b001000,
        U = 6'b010000,
        J = 6'b100000,
    }

    // 制御に使うフラグ用の構造体
    struct InstCtrl {
        itype    : InstType   , // 命令の形式
        rwb_en   : logic      , // レジスタに書き込むかどうか
        is_lui   : logic      , // LUI命令である
        is_aluop : logic      , // ALUを利用する命令である
        is_jump  : logic      , // ジャンプ命令である
        is_load  : logic      , // ロード命令である
        is_system: logic      , // CSR命令である
        is_fence : logic      , // フェンス命令である
        funct3   : logic   <3>, // 命令のfunct3フィールド
        funct7   : logic   <7>, // 命令のfunct7フィールド
    }
}
#@end
//}

@<code>{InstType}は、命令の形式を表すための列挙型です。
@<code>{InstType}の幅は6ビットで、それぞれのビットに1つの命令形式が対応しています。
どの命令形式にも対応しない場合、すべてのビットが0の@<code>{InstType::X}を対応させます。

@<code>{InstCtrl}は、制御に使うフラグを列挙するための構造体です。
@<code>{itype}には命令の形式、@<code>{funct3}, @<code>{funct7}には、
それぞれ命令の@<code>{funct3}, @<code>{funct3}フィールドを格納します。
これ以外の構造体のメンバーについては、使用するときに説明します。

命令をデコードするとき、まずopcodeを使って判別します。
このために、デコードに使う定数を@<code>{eei}パッケージに記述します。

//list[opcode.eei][eei.verylに追加で記述する]{
#@maprange(scripts/04/id-range/core/src/eei.veryl, opcode)
    // opcode
    const OP_OP_IMM  : logic<7> = 7'b0010011;
    const OP_LUI     : logic<7> = 7'b0110111;
    const OP_AUIPC   : logic<7> = 7'b0010111;
    const OP_OP      : logic<7> = 7'b0110011;
    const OP_JAL     : logic<7> = 7'b1101111;
    const OP_JALR    : logic<7> = 7'b1100111;
    const OP_BRANCH  : logic<7> = 7'b1100011;
    const OP_LOAD    : logic<7> = 7'b0000011;
    const OP_STORE   : logic<7> = 7'b0100011;
    const OP_MISC_MEM: logic<7> = 7'b0001111;
    const OP_SYSTEM  : logic<7> = 7'b1110011;
#@end
//}

これらの値とそれぞれの命令の対応については、
仕様書Volume Iの@<code>{37. RV32/64G Instruction Set Listings}を確認してください。

=== デコードと即値の生成

デコード処理を書く準備が整いました。
@<code>{src/inst_decoder.veryl}を作成し、次のように記述します。

//list[inst_decoder.veryl][inst_decoder.veryl]{
#@mapfile(scripts/04/id/core/src/inst_decoder.veryl)
import eei::*;
import corectrl::*;

module inst_decoder (
    bits: input  Inst    ,
    ctrl: output InstCtrl,
    imm : output UIntX   ,
) {
    // 即値の生成
    let imm_i_g: logic<12> = bits[31:20];
    let imm_s_g: logic<12> = {bits[31:25], bits[11:7]};
    let imm_b_g: logic<12> = {bits[31], bits[7], bits[30:25], bits[11:8]};
    let imm_u_g: logic<20> = bits[31:12];
    let imm_j_g: logic<20> = {bits[31], bits[19:12], bits[20], bits[30:21]};
    let imm_z_g: logic<17> = bits[31:15]; // {csr address, uimm}

    let imm_i: UIntX = {imm_i_g[msb] repeat XLEN - $bits(imm_i_g), imm_i_g};
    let imm_s: UIntX = {imm_s_g[msb] repeat XLEN - $bits(imm_s_g), imm_s_g};
    let imm_b: UIntX = {imm_b_g[msb] repeat XLEN - $bits(imm_b_g) - 1, imm_b_g, 1'b0};
    let imm_u: UIntX = {imm_u_g[msb] repeat XLEN - $bits(imm_u_g) - 12, imm_u_g, 12'b0};
    let imm_j: UIntX = {imm_j_g[msb] repeat XLEN - $bits(imm_j_g) - 1, imm_j_g, 1'b0};
    let imm_z: UIntX = {1'b0 repeat XLEN - $bits(imm_z_g), imm_z_g};

    let op: logic<7> = bits[6:0];
    let f7: logic<7> = bits[31:25];
    let f3: logic<3> = bits[14:12];

    const T: logic = 1'b1;
    const F: logic = 1'b0;

    always_comb {
        imm = case op {
            OP_LUI, OP_AUIPC                        : imm_u,
            OP_JAL                                  : imm_j,
            OP_JALR, OP_LOAD, OP_OP_IMM, OP_MISC_MEM: imm_i,
            OP_BRANCH                               : imm_b,
            OP_STORE                                : imm_s,
            OP_SYSTEM                               : imm_z,
            default                                 : 'x,
        };
        ctrl = {case op {
            OP_LUI     : {InstType::U, T, T, F, F, F, F, F},
            OP_AUIPC   : {InstType::U, T, F, F, F, F, F, F},
            OP_JAL     : {InstType::J, T, F, F, T, F, F, F},
            OP_JALR    : {InstType::I, T, F, F, T, F, F, F},
            OP_BRANCH  : {InstType::B, F, F, F, F, F, F, F},
            OP_LOAD    : {InstType::I, T, F, F, F, T, F, F},
            OP_STORE   : {InstType::S, F, F, F, F, F, F, F},
            OP_OP      : {InstType::R, T, F, T, F, F, F, F},
            OP_OP_IMM  : {InstType::I, T, F, T, F, F, F, F},
            OP_MISC_MEM: {InstType::I, F, F, F, F, F, F, T},
            OP_SYSTEM  : {InstType::I, T, F, F, F, F, T, F},
            default    : {InstType::X, F, F, F, F, F, F, F},
        }, f3, f7};
    }
}
#@end
//}

inst_decoderモジュールは、
命令のビット列@<code>{bits}を受け取り、
制御信号@<code>{ctrl}と即値@<code>{imm}を出力します。

==== 即値の生成

B形式の命令について考えます。
まず、命令のビット列から即値部分を取り出して、@<code>{imm_b_g}ワイヤを生成します。
B形式の命令内に含まれている即値は12ビットで、最上位ビットは符号ビットです。
最上位ビットを繰り返す(符号拡張する)ことによって、32ビットの即値@<code>{imm_b}を生成します。

@<code>{imm_z}はCSR命令で使用する即値をまとめたものです。
これについては後の章で説明します。

@<code>{always_comb}ブロックでは、
opcodeをcase式で分岐することにより@<code>{imm}ポートに適切な即値を出力しています。

==== 制御フラグの生成

opcodeがOP-IMMな命令、例えばADDI命令について考えます。
ADDI命令は、即値とソースレジスタの値を足し、
デスティネーションレジスタに結果を格納する命令です。

@<code>{always_comb}ブロックでは、
opcodeが@<code>{OP_OP_IMM}のとき、次のように制御信号@<code>{ctrl}を設定します。

 * 命令形式@<code>{itype}を@<code>{InstType::I}に設定します
 * @<code>{funct3}, @<code>{funct7}を命令中のビットをそのまま設定します 
 * 結果をレジスタに書き込むため、@<code>{rwb_en}を@<code>{1}に設定します
 * ALU(計算を実行するユニット)を利用するため、@<code>{is_aluop}を@<code>{1}に設定します。
 * それ以外のメンバーは@<code>{0}に設定します。

=== デコーダのインスタンス化

inst_decoderモジュールを、@<code>{core}モジュールでインスタンス化します。

//list[core.veryl.id][inst_decoderのインスタンス化(core.veryl)]{
#@maprange(scripts/04/id-range/core/src/core.veryl,inst)
    let inst_pc  : Addr     = if_fifo_rdata.addr;
    let inst_bits: Inst     = if_fifo_rdata.bits;
    var inst_ctrl: InstCtrl;
    var inst_imm : UIntX   ;

    inst decoder: inst_decoder (
        bits: inst_bits,
        ctrl: inst_ctrl,
        imm : inst_imm ,
    );
#@end
//}

まず、デコーダとcoreモジュールを接続するために@<code>{inst_ctrl}と@<code>{inst_imm}を定義します。
次に、inst_decoderモジュールをインスタンス化します。
@<code>{bits}ポートに@<code>{inst_bits}を渡すことで、フェッチした命令をデコードします。

//list[core.veryl.id.debug][デコード結果の表示プログラム(core.veryl)]{
#@maprange(scripts/04/id-range/core/src/core.veryl,debug)
    always_ff {
        if if_fifo_rvalid {
            $display("%h : %h", inst_pc, inst_bits);
            $display("  itype   : %b", inst_ctrl.itype);
            $display("  imm     : %h", inst_imm);
        }
    }
#@end
//}

デバッグ用の@<code>{always_ff}ブロックに、デコードした結果を表示するプログラムを記述します。

@<code>{sample.hex}をメモリの初期値として使い、デコード結果を確認します。

//terminal[sim-id][デコーダのテスト]{
$ @<userinput>{make build sim}
$ @<userinput>{obj_dir/sim src/sample.hex 7}
00000000 : 01234567
  itype   : 000010
  imm     : 00000012
00000004 : 89abcdef
  itype   : 100000
  imm     : fffbc09a
00000008 : deadbeef
  itype   : 100000
  imm     : fffdb5ea
0000000c : cafebebe
  itype   : 000000
  imm     : 00000000
//}

例えば@<code>{01234567}は、@<code>{jalr x10, 18(x6)}という命令のビット列になります。
命令の種類はJALRで、命令形式はI形式、即値は10進数で@<code>{18}です。
デコード結果を確認すると、
@<code>{itype}が@<code>{0000010}、
@<code>{imm}が@<code>{00000012}に   なっており、正しくデコードできていることが確認できます。

== レジスタの定義と読み込み

RV32Iの仕様では、32ビット幅のレジスタが32個用意されています。
0番目のレジスタの値は常に0です。

命令を実行するとき、実行に使うデータをレジスタ番号で指定することがあります。
実行に使うデータとなるレジスタのことを、ソースレジスタと呼びます。
また、命令の結果を、指定された番号のレジスタに格納することがあります。
このために使われるレジスタのことを、デスティネーションレジスタと呼びます。

coreモジュールに、レジスタを定義します。
RV32Iのレジスタの幅はXLEN(=32)ビットです。
よって、サイズが32の@<code>{UIntX}型のレジスタの配列を定義します。

//list[core.reg.define][レジスタの定義 (core.veryl)]{
#@maprange(scripts/04/reg-range/core/src/core.veryl,define)
    // レジスタ
    var regfile: UIntX<32>;
#@end
//}

レジスタをまとめたもののことをレジスタファイルと呼ぶため、@<code>{regfile}という名前をつけています。

@<img>{riscv-inst-types}を見るとわかるように、
RISC-Vの命令は形式によってソースレジスタの数が異なります。
例えば、R形式はソースレジスタが2つで、2つのレジスタのデータを使って実行されます。
それに対して、I形式のソースレジスタは1つです。
I形式の命令の実行には、ソースレジスタのデータと即値を利用します。

レジスタを定義したので、命令が使用するレジスタのデータを取得します。
命令のビット列の中のソースレジスタの番号の場所は、命令形式が違っても共通の場所にあります。

ここで、プログラムを簡単にするために、
命令中のソースレジスタの番号にあたる場所に、
常にソースレジスタの番号が書かれていると解釈します。
更に、命令がレジスタのデータを利用するかどうかに関係なく、
常にレジスタのデータを読み込むことにします。

//list[core.reg.use][命令が使うレジスタのデータを取得する (core.veryl)]{
#@maprange(scripts/04/reg-range/core/src/core.veryl,use)
    // レジスタ番号
    let rs1_addr: logic<5> = inst_bits[19:15];
    let rs2_addr: logic<5> = inst_bits[24:20];

    // ソースレジスタのデータ
    let rs1_data: UIntX = if rs1_addr == 0 {
        0
    } else {
        regfile[rs1_addr]
    };
    let rs2_data: UIntX = if rs2_addr == 0 {
        0
    } else {
        regfile[rs2_addr]
    };
#@end
//}

@<code>{if}式により、0番目のレジスタが指定されたときは、常に0になるようにします。

レジスタの値を読み込めていることを確認するために、
次のように記述します。

//list[core.reg.debug][レジスタの値を表示する (core.veryl)]{
#@maprange(scripts/04/reg-range/core/src/core.veryl,debug)
    always_ff {
        if if_fifo_rvalid {
            $display("%h : %h", inst_pc, inst_bits);
            $display("  itype   : %b", inst_ctrl.itype);
            $display("  imm     : %h", inst_imm);
            $display("  rs1[%d] : %h", rs1_addr, rs1_data);
            $display("  rs2[%d] : %h", rs2_addr, rs2_data);
        }
    }
#@end
//}

@<code>{$display}システムタスクで、命令のレジスタ番号とデータを表示します。
早速動作のテストをしたいところですが、今のままだとレジスタのデータが初期化されておらず、
0番目のレジスタのデータ以外は不定(0か1か分からない)になってしまいます。

これではテストする意味がないため、レジスタの値を適当な値に初期化します。

//list[core.reg.init][レジスタの値を初期化する (core.veryl)]{
#@maprange(scripts/04/reg-range/core/src/core.veryl,init)
    // レジスタの初期化
    always_ff {
        if_reset {
            for i: i32 in 0..32 {
                regfile[i] = i + 100;
            }
        }
    }
#@end
//}

上のコードでは、@<code>{always_ff}ブロックの@<code>{if_reset}で、
n番目(32 > n > 0)のレジスタの値を@<code>{n + 100}で初期化しています。

//terminal[reg.debug][レジスタ読み込みのデバッグ]{
$ @<userinput>{make build sim}
$ @<userinput>{obj_dir/sim sample.hex 7}
TODO にゃ
//}

@<code>{01234567}は@<code>{jalr x10, 18(x6)}です。
JALR命令は、2つのソースレジスタ@<code>{x10}と@<code>{x6}を使用します。
それぞれ、レジスタ番号が@<code>{10}, @<code>{6}であることを表しており、
値は@<code>{110}, @<code>{106}になります。
これが、シミュレーションと一致していることを確認してください。

== ALUを作り、計算する

命令は足し算や引き算、ビット演算などの計算を行います。
計算の対象となるデータが揃ったので、ALU(計算する部品)を作成します。

データの幅は@<code>{XLEN}です。
計算には、符号付き整数と符号なし整数向けの計算があります。
これに利用するために、eeiモジュールに@<code>{XLEN}ビットの符号あり整数型を定義します。

//list[eei.veryl.sint][XLENビットの符号付き整数を定義する (eei.veryl)]{
#@maprange(scripts/04/alu-range/core/src/eei.veryl,define)
    type SIntX  = signed logic<XLEN>;
    type SInt32 = signed logic<32>  ;
    type SInt64 = signed logic<64>  ;
#@end
//}

次に、@<code>{src/alu.veryl}を作成し、次のように記述します。

//list[alu.veryl.all][alu.veryl]{
#@mapfile(scripts/04/alu/core/src/alu.veryl)
import eei::*;
import corectrl::*;

module alu (
    ctrl  : input  InstCtrl,
    op1   : input  UIntX   ,
    op2   : input  UIntX   ,
    result: output UIntX   ,
) {
    let add: UIntX = op1 + op2;
    let sub: UIntX = op1 - op2;

    let srl: UIntX = op1 >> op2[4:0];
    let sra: SIntX = $signed(op1) >>> op2[4:0];

    always_comb {
        if ctrl.is_aluop {
            case ctrl.funct3 {
                3'b000: result = if ctrl.itype == InstType::I | ctrl.funct7 == 0 {
                            add // ADD, ADDI
                        } else {
                            sub // SUB
                        };
                3'b001: result = op1 << op2[4:0]; // SLL, SLLI
                3'b010: result = {1'b0 repeat XLEN - 1, $signed(op1) <: $signed(op2)}; // SLT, SLTI
                3'b011: result = {1'b0 repeat XLEN - 1, op1 <: op2}; // SLTU, SLTUI
                3'b100: result = op1 ^ op2; // XOR, XORI
                3'b101: result = if ctrl.funct7 == 0 {
                            srl // SRL, SRLI
                        } else {
                            sra // SRA, SRAI
                        };
                3'b110 : result = op1 | op2; // OR, ORI
                3'b111 : result = op1 & op2; // AND, ANDI
                default: result = 'x;
            }
        } else {
            result = add;
        }
    }
}
#@end
//}

@<code>{alu}モジュールには、次のポートを定義します。

//table[alu.veryl.port][aluモジュールのポート定義]{
ポート名	方向	型	用途	
-------------------------------------------------------------
ctrl	input	InstCtrl	制御用信号
op1		input	UIntX		1つ目のデータ
op2 	input	UIntX		2つ目のデータ
result	output	UIntX		結果
//}

命令がALUでどのような計算を行うかは命令の種別によって異なります。
RV32Iでは、仕様書の@<code>{2.4. Integer Computational Instructions}(整数演算命令)に定義されている命令は、
命令のfunct3, funct7フィールドによって計算の種類を特定することができます。

それ以外の命令は、CSR命令を除いて足し算しか行いません。
そのため、デコード時に整数演算命令とそれ以外の命令を@<code>{InstCtrl.is_aluop}で区別し、
整数演算命令以外は常に足し算を行うようにしています。
具体的には、@<code>{opcode}がOPかOP-IMMの命令の@<code>{InstCtrl.is_aluop}を@<code>{1}にしています。
(inst_decoderモジュールを確認してください)

@<code>{always_comb}ブロックでは、
case文でfunct3によって計算を区別します。
それだけでは区別できないとき、funct7を使用します。

//list[core.veryl.alu.data][ALUに渡すデータの用意 (core.veryl)]{
#@maprange(scripts/04/alu-range/core/src/core.veryl,data)
    // ALU
    var op1       : UIntX;
    var op2       : UIntX;
    var alu_result: UIntX;

    always_comb {
        case inst_ctrl.itype {
            InstType::R, InstType::B: {
                                          op1 = rs1_data;
                                          op2 = rs2_data;
                                      }
            InstType::I, InstType::S: {
                                          op1 = rs1_data;
                                          op2 = inst_imm;
                                      }
            InstType::U, InstType::J: {
                                          op1 = inst_pc;
                                          op2 = inst_imm;
                                      }
            default: {
                         op1 = 'x;
                         op2 = 'x;
                     }
        }
    }
#@end
//}

次に、ALUに渡すデータを用意します。
@<code>{UIntX}型の変数@<code>{op1}, @<code>{op2}, @<code>{alu_result}を定義し、
@<code>{always_comb}ブロックで値を割り当てます。
割り当てるデータは命令形式によって次のように異なります。

 : R形式, B形式
	R形式, B形式は、レジスタのデータとレジスタのデータの演算を行います。
	@<code>{op1}, @<code>{op2}は、レジスタのデータ@<code>{rs1_data}, @<code>{rs2_data}になります。

 : I形式, S形式
	I形式, S形式は、レジスタのデータと即値の演算を行います。
	@<code>{op1}, @<code>{op2}は、それぞれレジスタのデータ@<code>{rs1_data}, 即値@<code>{inst_imm}になります。
	S形式はメモリのストア命令に利用されており、
	レジスタのデータと即値を足し合わせた値がアクセスするアドレスになります。

 : U形式, J形式
	U形式, J形式は、即値とPCを足した値、または即値を使う命令に使われています。
	@<code>{op1}, @<code>{op2}は、それぞれPC@<code>{inst_pc}, 即値@<code>{inst_imm}になります。
	J形式はJAL命令に利用されており、即値とPCを足した値がジャンプ先になります。
	U形式はAUIPC命令とLUI命令に利用されています。
	AUIPC命令は、即値とPCを足した値をデスティネーションレジスタに格納します。
	LUI命令は、即値をそのままデスティネーションレジスタに格納します。

//list[core.veryl.alu.inst][ALUのインスタンス化 (core.veryl)]{
#@maprange(scripts/04/alu-range/core/src/core.veryl,inst)
    inst alum: alu (
        ctrl  : inst_ctrl ,
        op1               ,
        op2               ,
        result: alu_result,
    );
#@end
//}

ALUに渡すデータを用意したので、aluモジュールをインスタンス化します。
結果を受け取る用の変数として、@<code>{alu_result}を指定します。

最後にALUが正しく動くことを確認します。
@<code>{always_ff}ブロックで、
@<code>{op1}, @<code>{op2}, @<code>{alu_result}を表示します。

//list[core.veryl.alu.debug][ALUのデバッグ (core.veryl)]{
#@maprange(scripts/04/alu-range/core/src/core.veryl,debug)
    always_ff {
        if if_fifo_rvalid {
            $display("%h : %h", inst_pc, inst_bits);
            $display("  itype   : %b", inst_ctrl.itype);
            $display("  imm     : %h", inst_imm);
            $display("  rs1[%d] : %h", rs1_addr, rs1_data);
            $display("  rs2[%d] : %h", rs2_addr, rs2_data);
            $display("  op1     : %h", op1); @<balloon>{追加}
            $display("  op2     : %h", op2); @<balloon>{追加}
            $display("  alu res : %h", alu_result); @<balloon>{追加}
        }
    }
#@end
//}

@<code>{sample.hex}を次のように書き換えます。

//list[sample.hex.debug][sample.hexを書き換える]{
#@mapfile(scripts/04/alu/core/src/sample.hex)
02000093 // addi x1, x0, 32
00100117 // auipc x2, 256
002081b3 // add x3, x1, x2
#@end
//}

それぞれの命令の意味は次のとおりです。

//table[sample.hex.alu][命令の意味]{
アドレス	命令	意味
-------------------------------------------------------------
00000000	addi x1, x0, 32		x1 = x0 + 32
00000004	auipc x2, 256		x2 = pc + 256
00000008	add x3, x1, x2		x3 = x1 + x2
//}

シミュレータを実行し、結果を確かめます。

//terminal[alu.debug][ALUのデバッグ]{
$ @<userinput>{make build sim}
$ @<userinput>{obj_dir/sim src/sample.hex 5}
TODO
//}

まだ結果をディスティネーションレジスタに格納する処理を作成していません。
そのため、レジスタの値は変わらないことに注意してください

 : addi x1, x0, 32
	@<code>{op1}は0番目のレジスタの値です。
	0番目のレジスタの値は常に0であるため、@<code>{00000000}と表示されています。
	@<code>{op2}は即値です。
	即値は32であるため、16進数で@<code>{00000020}と表示されています。
	ALUの計算結果として、0と32を足した結果@<code>{00000020}が表示されています。

 : auipc x2, 256
	@<code>{op1}は2番目のレジスタの値です。
	2番目のレジスタは@<code>{102}として初期化しているので、@<code>{TODO}と表示されています。
	@<code>{op2}はPCです。
	命令のアドレス@<code>{00000004}が表示されています。
	ALUの計算結果として、これを足した結果@<code>{TODO}が表示されています。

 : add x3, x1, x2
	@<code>{op1}は1番目のレジスタの値です。
	1番目のレジスタは@<code>{101}として初期化しているので、@<code>{TODO}と表示されています。
	2番目のレジスタは@<code>{102}として初期化しているので、@<code>{TODO}と表示されています。
	ALUの計算結果として、これを足した結果@<code>{TODO}が表示されています。

== レジスタに値を書き込む

CPUはレジスタから値を読み込み、これを計算して、レジスタに結果の値を書き戻します。
レジスタに値を書き戻すことを、ライトバックと言います。

=== ライトバックの実装

計算やメモリアクセスが終わったら、その結果をレジスタに書き込みます。
書き込む対象のレジスタはrd番目のレジスタです。
書き込むかどうかはInstCtrl.reg_wenで表されます。

プログラム

=== ライトバックのテスト

ここで、プログラムをテストしましょう。

メモリに格納されている命令は～なので、結果が～になることを確認できます。


== ロード、ストア命令

=== LW, SW命令
RISC-Vにはメモリのデータを読み込む/書き込む命令として次の命令があります。

表

これらの命令で指定するメモリのアドレスは足し算です。
先ほど作ったALUは、ALUを使用する命令ではない場合は常に足し算を行うため、ALUの結果をアドレスとして利用できます。

まず32ビット単位で読み書きを行うLW, SW命令を実装します。

メモリ操作を行うモジュールを@<code>{memunit.veryl}に定義します。

プログラム

memunitモジュールでは、命令がメモリ命令の時、ALUから受け取ったアドレスをメモリに渡して操作を実行します。
書き込み命令の時は、書き込む値をmemif.wdataに設定し、memif.wenを1に設定します。

memunitモジュールをcoreモジュールにインスタンス化します。
ここで、memunitモジュールとメモリの接続は、命令フェッチ用のインターフェースとは別にしなくてはいけません。
そのため、coreモジュールに新しくmemif_dataを定義し、これをmemunitモジュールと接続します。

これでtopモジュールにはロードストア命令と命令フェッチのインターフェースが2つ存在します。
しかし、メモリは同時に1つの読み込みまたは書き込みしかできないため、これを調停する必要があります。

topモジュールに、ロードストアと命令フェッチが同時に要求した場合は、ロードストアを優先するプログラムを記述します。

ロードストアには複数クロックかかるため、これが完了していないことを示すワイヤがあります。
これを見て、coreは処理を進めます。

アラインの例外について注記を入れる

=== LH[U], LB[U], SH, SB命令

ロード、ストア命令には、2バイト単位, 1バイト単位での読み書きを行う命令も存在します。

まずロード命令を実装します。
ロード命令は32bit単位での読み込みをしたものの一部を切り取ってあげればよさそうです。

プログラム

次に、ストア命令を実装します。
ここで32ビット単位で読み込んだ後に一部を書き換えて書き込んであげる方法、
またはメモリモジュール側で一部のみを書き込む操作をサポートする方法が考えられます。
本書では後者を採用します。

memifインターフェースに、どこの書き込みを行うかをバイト単位で示すワイヤを追加します。

プログラム

これを利用して、読み込みして加工して書き込みという操作をサポートさせます。

プログラム

== 分岐, ジャンプ

まだ、重要な命令を実装できていません。
分岐命令とジャンプ命令を実装します。

=== JAL, JALR命令

JAL(Jump And Link)命令は相対アドレスでジャンプ先を指定し、ジャンプします。
ジャンプ命令である場合はPCの次の値をPC + 即値に設定するようにします。
Linkとあるように、rdレジスタに現在のPC+4を格納します。

プログラム

JALR(Jump And Link Register)命令は、レジスタに格納されたジャンプ先にジャンプします。
レジスタの値と即値を加算し、次のPCに設定します。
JAL命令と同様に、rdレジスタに現在のPC+4を格納します。

プログラム

=== 分岐命令

分岐命令には次の種類があります。
全ての分岐命令は相対アドレスで分岐先を指定します。

分岐するかどうかの判定を行うモジュールを作成します。

プログラム

alubrモジュールの＊が1かつ、分岐命令である場合、PCをPC+即値に指定します。
分岐しない場合はそのままです。

== riscv-testsでテストする

古いのをappendixにする。

riscv-testsは、RISC-VのCPUが正しく動くかどうかを検証するためのテストセットです。
これを実行することでCPUが正しく動いていることを確認します。

riscv-testsのビルド方法については付録を参考にしてください。

=== 最小限のCSR命令の実装

riscv-testsを実行するためには、いくつかの制御用のレジスタ(CSR)と、それを読み書きする命令(CSR命令)が必要になります。
それぞれの命令やレジスタについて、本章では深く立ち入りません。

==== mtvec

==== ecall命令

==== mret命令

=== 終了検知

riscv-testsが終了したことを検知し、それが成功か失敗かどうかを報告する必要があります。

riscv-testsは終了したことを示すためにメモリのあああ番地に値を書き込みます。
この値が1のとき、riscv-testsが正常に終了したことを示します。
それ以外の時は、riscv-testsが失敗したことを示します。

riscv-testsの終了の検知処理をtopモジュールに記述します。

プログラム

=== テストの実行

試しにaddのテストを実行してみましょう。
add命令のテストはrv32ui-p-add.bin.hexに格納されています。
これを、メモリのreadmemhで読み込むファイルに指定します。

プログラム

ビルドして実行し、正常に動くことを確認します。

==== 複数のテストを自動で実行する

add以外の命令もテストしたいですが、そのためにreadmemhを書き換えるのは大変です。
これを簡単にするために、readmemhにはマクロで指定する定数を渡します。

プログラム

自動でテストを実行し、その結果を報告するプログラムを作成します。

プログラム

このPythonプログラムは、riscv-testsフォルダにあるhexファイルについてテストを実行し、結果を報告します。
引数に対象としたいプログラムの名前の一部を指定することができます。

今回はRV32Iのテストを実行したいので、riscv-testsのRV32I向けのテストの接頭辞であるrv32ui-p-引数に指定すると、次のように表示されます。
