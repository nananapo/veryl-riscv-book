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
    type DataType = UInt32;

    var valid : logic   ;
    var ready : logic   ;
    var addr  : Addr    ;
    var wen   : logic   ;
    var wdata : DataType;
    var rvalid: logic   ;
    var rdata : DataType;

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
    param MEMORY_WIDTH: u32    = 20, // メモリのサイズ
    param FILE_PATH   : string = "" // メモリの初期値が格納されたファイルのパス
    ,
) (
    clk   : input   clock           ,
    rst   : input   reset           ,
    membus: modport membus_if::slave,
) {

    var mem: membus_if::DataType [2 ** MEMORY_WIDTH];

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
	指定しない場合は""になり初期化されません。
	初期化は$readmemhシステムタスクで行います。

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

module top #(
    param MEM_FILE_PATH: string = "",
) (
    clk: input clock,
    rst: input reset,
) {
    inst membus: membus_if;

    inst mem: memory #(
        FILE_PATH: MEM_FILE_PATH,
    ) (
        clk     ,
        rst     ,
        membus  ,
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

これにより、0,4,8,c,10,...という順番で次々に命令をフェッチするようになっています。

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

=== フェッチのテスト

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

Verilatorでのシミュレーションの実行のためにC++プログラムを作成します。
@<code>{src/test_verilator.cpp}を作成し、次のように記述します。

//list[test_verilator.cpp][test_verilator.cpp]{
にゃ
//}

このC++プログラムでは、
topモジュール(プログラム中ではVtopクラス)をインスタンス化し、
そのクロックを反転して実行するのを繰り返しています。

利用できるパラメータは次の通りです。

 : -time, -t
	何クロックで実行を終了するか。
	0のときは終了しない。
	デフォルト値は0。

 : -memory, -m
	メモリの初期値のファイルへのパス。
	デフォルト値は""。

@<code>{verilator}コマンドを実行し、シミュレータをビルドします。

//terminal[build.simulator][シミュレータのビルド]{
$ verilator にゃ
//}

上記のコマンドの実行により、シミュレータが@<code>{にゃ}に生成されました。
シミュレータを実行する前にメモリの初期値となるファイルを作成します。
@<code>{src/sample.hex}を作成し、次のように記述します。

//list[sample.hex][sample.hex]{
#@mapfile(scripts/04/memif/core/src/sample.hex)
01234567
89abcdef
deadbeef
cafebebe
#@end
//}

値は16進数で4バイトずつ記述されています。
シミュレーションを実行すると、このファイルはmemoryモジュールの@<code>{readmemh}システムタスクによって読み込ます。
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

生成されたシミュレータを実行し、0, 4, 8, cのデータが正しくフェッチされていることを確認します。

//terminal[check-memory][命令フェッチの動作チェック]{
$ Vtop -t 6 -m sample.hex
実行結果
//}

メモリファイルのデータが4バイトずつ読み込まれていることが確認できます。

ビルド、シミュレータのビルドのために一々コマンドを打つのは面倒です。
これらの作業を一つのコマンドで済ますために、@<code>{Makefile}を作成し、次のように記述します。

//list[Makefile][Makefile]{
//}

これ以降、次のようにビルドやシミュレータのビルドができるようになります。

//terminal[build.command][Makefileによって追加されたコマンド]{
$ @<userinput>{make build} @<balloon>{ビルド}
$ @<userinput>{make sim} @<balloon>{シミュレータのビルド}
$ @<userinput>{make clean} @<balloon>{ビルドした成果物の削除}
//}

== 命令のデコードと即値の生成

次に各命令がどのような意味を持つのかを、命令のビットをチェックすることで取得します。

RV32Iでは、次の形の命令フォーマットが定義されています。
ここに各形式の簡単な説明。

デコード処理を書く前に、デコードの結果生成する列挙子と構造体を@<code>{src/ctrl.veryl}に定義します。

まず、形式を示すenumを作成します。

次に、命令がどのような操作を行うかを示す構造体を作成します。

追加で、構造体を引数にとって、それがどのような命令であるかを判別する関数を作成しておきます。

それでは、命令のデコード処理を書きます。
デコーダとして、@<code>{src/decode.veryl}を定義します。

decodeモジュールでは、受け取った命令のOPビットを確認し、その値によってInstType, InstCtrl, 即値を設定しています。
処理の振り分けにはcase文を使用しています。

decodeモジュールをcoreモジュールでインスタンス化します。
命令のデコード結果を表示し、次のように表示されているか確認してください。

== レジスタの定義と読み込み

最初に説明した通り、RV32Iでは32ビット幅のレジスタが32個用意されています。
0番目のレジスタの値は常に0です。

coreモジュールに、レジスタを定義します。
初期値を0に設定しておきます。

RV32Iの命令は、最大で2個のレジスタの値を同時に読み出します。
命令の中のレジスタのアドレスを示すビットの場所は共通で、rs1, rs2, rdで示されています。
このうち、rs1, rs2はソースレジスタ、rdはディスティネーションレジスタ(結果の書き込み先)です。

簡単のために、命令がレジスタを使用するか否かにかかわらず、常にレジスタの値を読み出すことにします。
0番目のレジスタが指定されたときは、レジスタを読み込まずに0を読み込んでいます。

== ALU

ALUとは、Arithmetic Logic Unitの略で、CPUの計算を行う部分です。
ALUは足し算や引き算、シフト命令などの計算を行います。
ALUでどの計算を行うかは、funct3, funct5によって判別します。

@<code>{alu.veryl}を作成し、次のように記述します。

プログラム

ポート定義

coreモジュールでaluモジュールをインスタンス化します。

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
