= RV32Iの実装

本章では、RISC-Vの基本整数命令セットである@<b>{RV32I}を実装します。
基本整数命令という名前の通り、
整数の足し引きやビット演算、
ジャンプ、分岐命令などの最小限の命令しか実装されていません。
また、32ビット幅の汎用レジスタが32個定義されています。
ただし、0番目のレジスタの値は常に0です。

RISC-VのCPUは基本整数命令セットを必ず実装して、
他の命令や機能は拡張として実装します。
複雑な機能を持つCPUを実装する前に、
まずは最小限の命令を実行できるCPUを実装しましょう。

== CPUは何をやっているのか?

上に書かれている文章の意味が分からなくても大丈夫です。
詳しく説明します。

CPUを実装するには何が必要でしょうか?
まずはCPUがどのような動作をするかについて考えてみます。
一般的に、
汎用のプログラムを実行するCPUは、
次の手順でプログラムを実行していきます。

 1. メモリからプログラムを読み込む
 2. プログラムを実行する
 3. 1, 2の繰り返し

ここで、メモリから読み込まれる「プログラム」とは一体何を示しているのでしょうか?
普通のプログラマが書くのはC言語やRustなどのプログラミング言語のプログラムですが、
通常のCPUはそれをそのまま解釈して実行することはできません。
そのため、メモリから読み込まれる「プログラム」とは、
CPUが読み込んで実行することができる形式のプログラムです。
これはよく「機械語」と呼ばれ、0と1で表される2進数のビット列@<fn>{trit.computer}で記述されています。

//footnote[trit.computer][その昔、Setunという3進数のコンピュータが存在したらしく、機械語は3進数のトリット(trit)で構成されていたようです]

メモリからプログラムを読み込んで実行するのがCPUの仕事ということが分かりました。
これをもう少し掘り下げます。

まず、プログラムをメモリから読み込むためには、
メモリのどこを読み込みたいのかという情報(アドレス)をメモリに与える必要があります。
また、当然ながらメモリが必要です。

CPUはプログラムを実行しますが、
一気にすべてのプログラムを読み込んだり実行するわけではなく、
プログラムの最小単位である「命令」を一つずつ読み込んで実行します。
命令をメモリに要求、取得することを、命令をフェッチするといいます。

命令がCPUに供給されると、
CPUは命令のビット列がどのような意味を持っていて、
何をすればいいかを判定します。
このことを、命令をデコードするといいます。

命令をデコードすると、いよいよ計算やメモリアクセスを行います。
しかし、例えば足し算を計算するにも、
何と何を足し合わせればいいのか分かりません。
この計算に使うデータは、次のいずれかで指定されます。

 * レジスタ(= CPUに存在する小さなメモリ)の番号
 * 即値(= 命令のビット列から生成される数値)

計算対象のデータにレジスタと即値のどちらを使うかは命令によって異なります。
レジスタの番号は命令のビット列の中に含まれています。

計算を実行するユニット(部品)のことを、ALU(Arithmetic Logic Unit)といいます。

計算やメモリアクセスが終わると、その結果をレジスタに格納します。
例えば、足し算を行う命令なら足し算の結果、
メモリから値を読み込む命令なら読み込まれた値を格納します。

これで命令の実行は終わりですが、CPUは次の命令を実行する必要があります。
今現在実行している命令のアドレスを格納しているレジスタのことをプログラムカウンタ(PC)と言い、
CPUはPCの値をメモリに渡すことで命令をフェッチしています。

CPUは次の命令を実行するために、
PCの値を次の命令のアドレスに設定します。
ジャンプ命令の場合は、PCの値をジャンプ先のアドレスに設定します。
分岐命令の場合は、まず、分岐の成否を判定します。
分岐が成立する場合は、PCの値を分岐先のアドレスに設定します。
分岐が成立しない場合は、通常の命令と同じように、
PCの値を次の命令のアドレスに設定します。

ここまでの話をまとめると、CPUの動作は次のようになります。

 1. PCに格納されたアドレスにある命令をフェッチする
 2. 命令を取得したらデコードする
 3. 計算で使用するデータを取得する (レジスタの値を取得したり、即値を生成する)
 4. 計算する命令の場合、計算を行う
 5. メモリにアクセスする命令の場合、メモリ操作を行う
 6. 計算やメモリアクセスの結果をレジスタに格納する
 7. PCの値を次に実行する命令に設定する

//image[cpu-arch][雑なCPUの図]

CPUが何をするものなのかが分かりましたか?
実装を始めましょう。

== プロジェクトの作成

まず、Verylのプロジェクトを作成します。
ここでは適当にcoreという名前にしています。

//terminal[veryl-new][新規プロジェクトの作成]{
$ @<userinput>{veryl new core}
[INFO ]      Created "core" project
//}

すると、プロジェクト名のフォルダと、その中に@<code>{Veryl.toml}が作成されます。
@<code>{Veryl.toml}を次のように変更してください(@<list>{Veryl.toml.first})。

//list[Veryl.toml.first][Veryl.toml]{
#@mapfile(scripts/04/eei-param/core/Veryl.toml)
[project]
name = "core"
version = "0.1.0"

[build]
sourcemap_target = {type ="none"}
#@end
//}

Verylのプログラムを格納するために、プロジェクトのフォルダ内にsrcフォルダを作成しておいてください。
//terminal[][]{
$ @<userinput>{cd core}
$ @<userinput>{mkdir src}
//}

== 定数の定義

いよいよプログラムを記述していきます。
まず、CPU内で何度も使用する定数や型を記述するパッケージを作成します。

@<code>{src/eei.veryl}を作成し、次のように記述します(@<list>{eei.veryl})。

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
ISAの定義もEEIに含まれているため、この名前を使用しています。

eeiパッケージには、次の定数を定義します。

 : XLEN
    XLENは、RISC-Vにおいて整数レジスタの長さを示す数字として定義されています。
    RV32Iのレジスタの長さは32ビットであるため、値を32にしています。
 : ILEN
    ILENは、RISC-VにおいてCPUの実装がサポートする命令の最大の幅を示す値として定義されています。
    RISC-Vの命令の幅は、後の章で説明する圧縮命令を除けばすべて32ビットです。
    そのため、値を32にしています。

また、何度も使用することになる型に、type文によって別名を付けています。

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

=== メモリのインターフェースを定義する

このメモリモジュールには、クロックとリセット信号の他に7個のポートを定義する必要があります(@<table>{memmodule-if})。
これを一つ一つ定義、接続するのは面倒なため、次のようなinterfaceを定義します。

@<code>{src/membus_if.veryl}を作成し、次のように記述します(@<list>{membus_if.veryl})。

//list[membus_if.veryl][インターフェースの定義 (membus_if.veryl)]{
#@mapfile(scripts/04/memif/core/src/membus_if.veryl)
interface membus_if::<DATA_WIDTH: const, ADDR_WIDTH: const> {
    var valid : logic            ;
    var ready : logic            ;
    var addr  : logic<ADDR_WIDTH>;
    var wen   : logic            ;
    var wdata : logic<DATA_WIDTH>;
    var rvalid: logic            ;
    var rdata : logic<DATA_WIDTH>;

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
ポート名	型					向き	意味
-------------------------------------------------------------
clk			clock				input	クロック信号
rst 		reset				input	リセット信号
valid		logic				input	メモリアクセスを要求しているかどうか
ready		logic				output	メモリアクセスを受容するかどうか
addr		logic<ADDR_WIDTH>	input	アクセスするアドレス
wen			logic				input	書き込みかどうか (1なら書き込み)
wdata		logic<DATA_WIDTH>	input	書き込むデータ
rvalid		logic				output	受容した要求の処理が終了したかどうか
rdata		logic<DATA_WIDTH>	output	受容した読み込み命令の結果
//}

membus_ifはジェネリックインターフェースです。
ジェネリックパラメータとして、
@<code>{ADDR_WIDTH}, @<code>{DATA_WIDTH}が定義されています。
@<code>{ADDR_WIDTH}はアドレスの幅、
@<code>{DATA_WIDTH}は1つのデータの幅です。

interfaceを利用することで、
変数の定義が不要になり、
さらにポートの相互接続を簡潔にすることができます。

=== メモリモジュールを実装する

メモリを作る準備が整いました。
@<code>{src/memory.veryl}を作成し、次のように記述します(@<list>{memory.veryl})。

//list[memory.veryl][メモリモジュールの定義 (memory.veryl)]{
#@mapfile(scripts/04/memif/core/src/memory.veryl)
module memory::<DATA_WIDTH: const, ADDR_WIDTH: const> (
    clk      : input   clock                                     ,
    rst      : input   reset                                     ,
    membus   : modport membus_if::<DATA_WIDTH, ADDR_WIDTH>::slave,
    FILE_PATH: input   string                                    , // メモリの初期値が格納されたファイルのパス
) {
    type DataType = logic<DATA_WIDTH>;

    var mem: DataType [2 ** ADDR_WIDTH];

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
        membus.rdata  = mem[membus.addr[ADDR_WIDTH - 1:0]];
        if membus.valid && membus.wen {
            mem[membus.addr[ADDR_WIDTH - 1:0]] = membus.wdata;
        }
    }
}
#@end
//}

memoryモジュールはジェネリックモジュールです。
次のジェネリックパラメータを定義しています。

 : DATA_WIDTH
    メモリのデータの単位の幅を指定するためのパラメータです。@<br>{}
    この単位ビットでデータを読み書きします。

 : ADDR_WIDTH
	メモリの容量を指定するためのパラメータです。@<br>{}
	メモリの容量はDATA_WIDTH * (2 ** ADDR_WIDTH)ビットになります。

ポートには、
クロック信号とリセット信号以外に、
membus_ifインターフェースとstring型の@<code>{FILE_PATH}を定義しています。
memoryモジュールを利用する時、
@<code>{FILE_PATH}ポートには、
メモリの初期値が格納されたファイルのパスを指定します。
初期化は@<code>{$readmemh}システムタスクで行います。

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

== 最上位モジュールの作成

次に、
最上位のモジュール(Top Module)を作成して、
memoryモジュールをインスタンス化します。

最上位のモジュールとは、
デザインの階層の最上位に位置するモジュールのことです。
論理設計では、最上位モジュールの中に、
あらゆるモジュールやレジスタなどをインスタンス化します。

memoryモジュールはジェネリックモジュールであるため、
1つのデータのビット幅とメモリのサイズを指定する必要があります。
2つの内、データのビット幅を示す定数をeeiパッケージに定義します(@<list>{eei.veryl.memif.width})。

//list[eei.veryl.memif.width][1つのデータのビット幅を示す定数を定義する (eei.veryl)]{
#@maprange(scripts/04/memif-range/core/src/eei.veryl,width)
    // メモリのデータ幅
    const MEM_DATA_WIDTH: u32 = 32;
#@end
//}

それでは、最上位のモジュールを作成します。
@<code>{src/top.veryl}を作成し、次のように記述します(@<list>{top.veryl.memory.inst})。

//list[top.veryl.memory.inst][最上位モジュールの定義 (top.veryl)]{
#@mapfile(scripts/04/memif/core/src/top.veryl)
import eei::*;

module top (
    clk          : input clock ,
    rst          : input reset ,
    MEM_FILE_PATH: input string,
) {

    inst membus: membus_if::<MEM_DATA_WIDTH, 20>;

    inst mem: memory::<MEM_DATA_WIDTH, 20> (
        clk                     ,
        rst                     ,
        membus                  ,
        FILE_PATH: MEM_FILE_PATH,
    );
}
#@end
//}

先ほど作成したmemoryモジュールと、
membus_ifインターフェースをインスタンス化しています。

ジェネリックパラメータの@<code>{DATA_WIDTH}には、
@<code>{eei::MEM_DATA_WIDTH}を指定しています。
@<code>{membus}インターフェースのアドレスの幅と、
memoryモジュールのメモリ容量には、
適当に20を指定しています。
これにより、
メモリ容量は32ビット * (2 ** 20) = 4メビバイトになります。

== 命令フェッチ

メモリを作成したので、
命令フェッチ処理を作ることができるようになりました。

いよいよ、CPUのメインの部分を作成していきます。

=== 命令フェッチを実装する

@<code>{src/core.veryl}を作成し、
次のように記述します(@<list>{core.veryl.all})。

//list[core.veryl.all][core.veryl]{
#@mapfile(scripts/04/create-core/core/src/core.veryl)
import eei::*;

module core (
    clk   : input   clock                          ,
    rst   : input   reset                          ,
    membus: modport membus_if::<ILEN, XLEN>::master,
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
                    if_is_requested = membus.ready && membus.valid;
                    if membus.ready && membus.valid {
                        if_pc           = if_pc_next;
                        if_pc_requested = if_pc;
                    }
                }
            } else {
                if membus.ready && membus.valid {
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

coreモジュールは、
クロック信号,
リセット信号,
membus_ifインターフェースをポートに持ちます。
membus_ifのジェネリックパラメータには、
データ単位としてILEN(1つの命令のビット幅),
アドレスの幅としてXLENを指定しています。

@<code>{if_pc}レジスタはPC(プログラムカウンタ)です。
ここで@<code>{if_}というprefixはinstruction fetch(命令フェッチ)の略です。
@<code>{if_is_requested}は現在フェッチ中かどうかを管理しており、
フェッチ中のアドレスを@<code>{if_pc_requested}に格納しています。

@<code>{always_comb}ブロックでは、
アドレス@<code>{if_pc}にあるデータを、
常にメモリに要求しています。
命令フェッチではメモリの読み込みしか行わないため、
@<code>{membus.wen}は@<code>{0}にしています。

上から1つめの@<code>{always_ff}ブロックでは、
フェッチ中かどうか,
メモリがready(要求を受け入れる)状態かどうかによって、
@<code>{if_pc},
@<code>{if_is_requested},
@<code>{if_pc_requested}の値を変更しています。

メモリにデータを要求する時、
@<code>{if_pc}を次の命令のアドレス(@<code>{4}を足したアドレス)に変更して、
@<code>{if_is_requested}を@<code>{1}に変更しています。
フェッチ中かつ@<code>{membus.rvalid}が@<code>{1}のとき、
命令フェッチが完了し、データが@<code>{membus.rdata}に供給されています。
このとき、メモリがready状態なら、
すぐに次の命令フェッチを開始します。
この状態遷移を繰り返すことによって、
0,4,8,c,10,...という順番のアドレスの命令を、
次々にフェッチするようになっています。

上から2つめの@<code>{always_ff}ブロックは、
デバッグ用の表示を行うプログラムです。
命令フェッチが完了したとき、
その結果を@<code>{$display}システムタスクによって出力します。

=== memoryモジュールとcoreモジュールを接続する

次に、
topモジュールでcoreモジュールをインスタンス化し、
membus_ifインターフェースを接続します。

coreモジュールが指定するアドレスは1バイト単位のアドレスです。
それに対して、
memoryモジュールは32ビット(=4バイト)単位でデータを整列しているため、
データは4バイト単位のアドレスで指定する必要があります。

まず、1バイト単位のアドレスを、
4バイト単位のアドレスに変換する関数を作成します
(@<list>{top.veryl.create-core-range.addr_to_memaddr})。
これは、1バイト単位のアドレスの下位2ビットを切り詰めることによって実現できます。

//list[top.veryl.create-core-range.addr_to_memaddr][アドレスを変換する関数を作成する (top.veryl)]{
#@maprange(scripts/04/create-core-range/core/src/top.veryl,addr_to_memaddr)
    // アドレスをメモリのデータ単位でのアドレスに変換する
    function addr_to_memaddr (
        addr: input logic<XLEN>,
    ) -> logic<20>   {
        return addr[20 + $clog2(MEM_DATA_WIDTH / 8) - 1:$clog2(MEM_DATA_WIDTH / 8)];
    }
#@end
//}

addr_to_memaddr関数は、
@<code>{MEM_DATA_WIDTH}(=32)をバイトに変換した値(=4)のlog2をとった値(=2)を使って、
@<code>{addr[21:2]}を切り取っています。

次に、coreモジュール用のmembus_ifインターフェースを作成します(@<list>{top.veryl.create-core-range.membus})。
ジェネリックパラメータには、
coreモジュールのインターフェースのジェネリックパラメータと同じく、
ILENとXLENを割り当てます。

//list[top.veryl.create-core-range.membus][coreモジュール用のmembus_ifインターフェースをインスタンス化する (top.veryl)]{
#@maprange(scripts/04/create-core-range/core/src/top.veryl,membus)
    inst membus     : membus_if::<MEM_DATA_WIDTH, 20>;
    @<b>|inst membus_core: membus_if::<ILEN, XLEN>;|
#@end
//}

@<code>{membus}と@<code>{membus_core}を接続します(@<list>{top.veryl.create-core-range.connect})。
アドレスは、@<code>{addr_to_memaddr}関数で変換した値を割り当てます。

//list[top.veryl.create-core-range.connect][membusとmembus_coreを接続する (top.veryl)]{
#@maprange(scripts/04/create-core-range/core/src/top.veryl,connect)
    always_comb {
        membus.valid      = membus_core.valid;
        membus_core.ready = membus.ready;
        // アドレスをデータ幅単位のアドレスに変換する
        membus.addr        = addr_to_memaddr(membus_core.addr);
        membus.wen         = 0; // 命令フェッチは常に読み込み
        membus.wdata       = 'x;
        membus_core.rvalid = membus.rvalid;
        membus_core.rdata  = membus.rdata;
    }
#@end
//}

最後に、coreモジュールをインスタンス化します。
これによって、メモリとCPUが接続されました。

//list[top.veryl.create-core-range.core][top.veryl内でcoreモジュールをインスタンス化する]{
#@maprange(scripts/04/create-core-range/core/src/top.veryl,core)
    inst c: core (
        clk                ,
        rst                ,
        membus: membus_core,
    );
#@end
//}

=== 命令フェッチをテストする

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
verilatorを利用するために、次のようなC++プログラムを書く必要があります@<fn>{verilator.only.verilog}。

//footnote[verilator.only.verilog][Verilogプログラムだけでビルドすることもできます]

@<code>{src/tb_verilator.cpp}を作成し、次のように記述します(@<list>{test_verilator.cpp})。

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

このC++プログラムは、
topモジュール(プログラム中ではVtop_coreクラス)をインスタンス化し、
そのクロックを反転して実行するのを繰り返しています。

このプログラムは、コマンドライン引数として次の2つの値を受け取ります。

 : MEMORY_FILE_PATH
	メモリの初期値のファイルへのパス。@<br>{}
	実行時にtopモジュールのMEM_FILE_PATHポートに渡されます。

 : CYCLE
	何クロックで実行を終了するかを表す値。@<br>{}
	0のときは終了しません。デフォルト値は0です。

Verilatorによるシミュレーションは、
topモジュールのクロック信号を更新して、
@<code>{eval}関数を呼び出すことにより実行します。
プログラムでは、
@<code>{clk}を反転させて@<code>{eval}するループの前に、
topモジュールをリセット信号によりリセットする必要があります。
そのため、
topモジュールの@<code>{rst}を1にしてから@<code>{eval}を実行し、
@<code>{rst}を0にしてまた@<code>{eval}を実行し、
@<code>{rst}を1にもどしてから@<code>{clk}を反転しています。

==== シミュレータのビルド

@<code>{verilator}コマンドを実行し、
シミュレータをビルドします(@<list>{build.simulator})。

//terminal[build.simulator][シミュレータのビルド]{
$ verilator --cc -f core.f --exe src/tb_verialtor.cpp --top-module top --Mdir obj_dir
$ make -C obj_dir -f Vcore_top.mk @<balloon>{シミュレータをビルドする}
$ mv obj_dir/Vcore_top obj_dir/sim @<balloon>{シミュレータの名前をsimに変更する}
//}

@<code>{verilator --cc}コマンドに、
次のコマンドライン引数を渡して実行することで、
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

上記のコマンドの実行により、
シミュレータが@<code>{obj_dir/sim}に生成されました。

==== メモリの初期化用ファイルの作成

シミュレータを実行する前にメモリの初期値となるファイルを作成します。
@<code>{src/sample.hex}を作成し、次のように記述します(@<list>{sample.hex})。

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
シミュレータを実行すると、
memoryモジュールは@<code>{$readmemh}システムタスクでsample.hexを読み込みます。
それにより、メモリは次のように初期化されます(@<table>{sample.hex.initial})。

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

生成されたシミュレータを実行し、
アドレスが0, 4, 8, cのデータが正しくフェッチされていることを確認します(@<list>{check-memory})。

//terminal[check-memory][命令フェッチの動作チェック]{
$ obj_dir/sim src/sample.hex 5
00000000 : 01234567
00000004 : 89abcdef
00000008 : deadbeef
0000000c : cafebebe
//}

メモリファイルのデータが、
4バイトずつ読み込まれていることが確認できます。

==== Makefileの作成

ビルド、シミュレータのビルドのために一々コマンドを打つのは非常に面倒です。
これらの作業を一つのコマンドで済ますために、
@<code>{Makefile}を作成し、
次のように記述します(@<list>{Makefile})。

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
        rm -rf $(OBJ_DIR)

sim:
        verilator --cc -f $(FILELIST) --exe $(TB_PROGRAM) --top-module $(PROJECT)_$(TOP_MODULE) --Mdir $(OBJ_DIR)
        make -C $(OBJ_DIR) -f V$(PROJECT)_$(TOP_MODULE).mk
        mv $(OBJ_DIR)/V$(PROJECT)_$(TOP_MODULE) $(OBJ_DIR)/$(SIM_NAME)
#@end
//}

これ以降、
次のようにVerylプログラムのビルド,
シミュレータのビルド,
成果物の削除ができるようになります(@<list>{build.command})。

//terminal[build.command][Makefileによって追加されたコマンド]{
$ @<userinput>{make build} @<balloon>{Verylプログラムのビルド}
$ @<userinput>{make sim} @<balloon>{シミュレータのビルド}
$ @<userinput>{make clean} @<balloon>{ビルドした成果物の削除}
//}

=== フェッチした命令をFIFOに格納する

フェッチした命令は次々に実行されますが、
その命令が何クロックで実行されるかは分かりません。
命令が常に1クロックで実行される場合は、
現状の常にフェッチし続けるようなコードで問題ありませんが、
例えばメモリにアクセスする命令は実行に何クロックかかるか分かりません。

複数クロックかかる命令に対応するために、
命令の処理が終わったら次の命令をフェッチするようにします。
すると、命令の実行の流れは次のようになります。

 1. 命令の処理が終わる
 2. 次の命令のフェッチ要求をメモリに送る
 3. 命令がフェッチされ、命令の処理を開始する

この場合、
命令の処理が終わってから次の命令をフェッチするため、
次々にフェッチするよりも多くのクロックサイクルが必要です。
これはCPUの性能を露骨に悪化させるので許容できません。

==== FIFOの作成

//image[fifo][FIFO][width=40%]

そこで、
@<b>{FIFO}(First In First Out, ファイフォ)を作成して、
フェッチした命令を格納します。
FIFOとは、先に入れたデータが先に出されるデータ構造のことです。
命令をフェッチしたらFIFOに格納(enqueue)し、
命令を処理するときにFIFOから取り出し(dequeue)ます。

@<code>{src/fifo.veryl}を作成し、次のように記述します(@<list>{fifo.veryl})。

//list[fifo.veryl][FIFOモジュールの実装 (fifo.veryl)]{
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
    }

    if WIDTH == 1 :wready_block {
        assign wready = head == tail && rready;
    } else {
        assign wready = tail_plus1 != head;
    }

    always_ff {
        if_reset {
            head = 0;
            tail = 0;
        } else {
            if wready && wvalid {
                mem[tail] = wdata;
                tail      = tail + 1;
            }
            if rready && rvalid {
                head = head + 1;
            }
        }
    }
}
#@end
//}

fifoモジュールは、
@<code>{DATA_TYPE}型のデータを
@<code>{2 ** WIDTH - 1}個格納することができるFIFOです。
操作は次のように行います。

 : データを追加する
    @<code>{wready}が@<code>{1}のとき、データを追加することができます。@<b>{}
    データを追加するためには、追加したいデータを@<code>{wdata}に格納し、@<code>{wvalid}を@<code>{1}にします。@<b>{}
    追加したデータは次のクロック以降に取り出すことができます。

 : データを取り出す
    @<code>{rready}が@<code>{1}のとき、データを取り出すことができます。@<b>{}
    データを取り出すことができるとき、@<code>{rdata}にデータが供給されています。@<b>{}
    @<code>{rvalid}を@<code>{1}にすることで、FIFOにデータを取り出したことを通知することができます。

データの格納状況は、@<code>{head}レジスタと@<code>{tail}レジスタで管理します。
データを追加するとき、つまり@<code>{wready && wvalid}のとき、@<code>{tail = tail + 1}しています。
データを取り出すとき、つまり@<code>{rready && rvalid}のとき、@<code>{head = head + 1}しています。

データを追加できる状況とは、
@<code>{tail}に1を足しても@<code>{head}を超えないとき、
つまり、@<code>{tail}が指す場所が一周してしまわないときです。
この制限から、FIFOには最大でも@<code>{2 ** WIDTH - 1}個しかデータを格納することができません。
データを取り出せる状況とは、@<code>{head}と@<code>{tail}の指す場所が違うときです。

特別に、@<code>{WIDTH}が1のときは、既にデータが1つ入っていても、
@<code>{rready}が@<code>{1}のときはデータを追加することができるようにしています。

==== 命令フェッチ処理の変更

fifoモジュールを使って、命令フェッチ処理を変更します。

まず、FIFOに格納する型を定義します(@<list>{core.veryl.if-fifo-range.fifo_type})。
@<code>{if_fifo_type}には、
命令のアドレス(@<code>{addr})と命令のビット列(@<code>{bits})を格納するためのメンバーを含めます。

//list[core.veryl.if-fifo-range.fifo_type][FIFOで格納する型を定義する (core.veryl)]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,fifo_type)
    // ifのFIFOのデータ型
    struct if_fifo_type {
        addr: Addr,
        bits: Inst,
    }
#@end
//}

次に、FIFOと接続するための変数を定義します(@<list>{core.veryl.if-fifo-range.fifo_reg})。
wdataとrdataのデータ型は@<code>{if_fifo_type}にしています。

//list[core.veryl.if-fifo-range.fifo_reg][FIFOと接続するための変数を定義する (core.veryl)]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,fifo_reg)
    // FIFOの制御用レジスタ
    var if_fifo_wready: logic       ;
    var if_fifo_wvalid: logic       ;
    var if_fifo_wdata : if_fifo_type;
    var if_fifo_rready: logic       ;
    var if_fifo_rvalid: logic       ;
    var if_fifo_rdata : if_fifo_type;
#@end
//}

FIFOモジュールをインスタンス化します(@<list>{core.veryl.if-fifo-range.inst_if_fifo})。
@<code>{DATA_TYPE}パラメータに@<code>{if_fifo_type}を渡すことで、
アドレスと命令のペアを格納することができるようにします。
@<code>{WIDTH}パラメータには@<code>{3}を指定することで、
サイズを@<code>{2 ** 3 - 1 = 7}にしています。
このサイズは適当です。

//list[core.veryl.if-fifo-range.inst_if_fifo][FIFOをインスタンス化する (core.veryl)]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,inst_if_fifo)
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

fifoモジュールをインスタンス化したので、
メモリへデータを要求する処理を変更します(@<list>{core.veryl.if-fifo-range.fetch})。

//list[core.veryl.if-fifo-range.fetch][フェッチ処理の変更 (core.veryl)]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,fetch)
    // 命令フェッチ処理
    always_comb {
        // FIFOに空きがあるとき、命令をフェッチする
        membus.valid = @<b>|if_fifo_wready|; @<balloon>{1をif_fifo_wreadyに変更}
        membus.addr  = if_pc;
        membus.wen   = 0;
        membus.wdata = 'x; // wdataは使用しない

        @<b>|// 常にFIFOから命令を受け取る|
        @<b>|if_fifo_rready = 1;|
    }
#@end
//}

@<list>{core.veryl.if-fifo-range.fetch}では、
メモリに命令フェッチを要求する条件を、
FIFOに空きがあるという条件に変更しています。
これにより、FIFOがあふれてしまうことがなくなります。
また、とりあえずFIFOから常にデータを取り出すようにしています。

最後に、命令をフェッチできたらFIFOに格納するコードを@<code>{always_ff}ブロックの中に追加します(@<list>{core.veryl.if-fifo-range.fifo_ctrl})。

//list[core.veryl.if-fifo-range.fifo_ctrl][FIFOへのデータの格納 (core.veryl)]{
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

また、@<code>{if_fifo_wvalid}と@<code>{if_fifo_wdata}を0に初期化します(@<list>{core.veryl.if-fifo-range.if_reset})。

//list[core.veryl.if-fifo-range.if_reset][変数の初期化 (core.veryl)]{
#@maprange(scripts/04/if-fifo-range/core/src/core.veryl,if_reset)
    if_reset {
        if_pc           = 0;
        if_is_requested = 0;
        if_pc_requested = 0;
        @<b>|if_fifo_wvalid  = 0;|
        @<b>|if_fifo_wdata   = 0;|
    } else {
#@end
//}

命令をフェッチできた時、
@<code>{if_fifo_wvalid}の値を@<code>{1}にして、
@<code>{if_fifo_wdata}にフェッチした命令とアドレスを格納します。
これにより、次のクロック以降のFIFOに空きがあるタイミングでデータが追加されます。

それ以外の時、
FIFOにデータを格納しようとしていてFIFOに空きがあるとき、
@<code>{if_fifo_wvalid}を@<code>{0}にすることでデータの追加を完了します。

命令フェッチはFIFOに空きがあるときにのみ行うため、
まだ追加されていないデータが@<code>{if_fifo_wdata}に格納されていても、
別のデータに上書きされてしまうことはありません。

==== FIFOのテスト

FIFOをテストする前に、命令のデバッグ表示を行うコードを変更します(@<list>{core.veryl.if-fifo-range.debug})。

//list[core.veryl.if-fifo-range.debug][命令のデバッグ表示を変更する (core.veryl)]{
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

それでは、シミュレータを実行します(@<list>{sim-fifo})。
命令がフェッチされて表示されるまでに、
FIFOに格納して取り出すクロック分だけ遅延があることに注意してください。

//terminal[sim-fifo][FIFOをテストする]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim src/sample.hex 7}
00000000 : 01234567
00000004 : 89abcdef
00000008 : deadbeef
0000000c : cafebebe
//}

== 命令のデコードと即値の生成

TODO

命令をフェッチすることができたら、
フェッチした命令がどのような意味を持つかをチェックし、
CPUが何をすればいいかを判断するためのフラグや値を生成します。
この作業のことを、命令のデコードと呼びます。

RISC-Vにはいくつかの命令の形式がありますが、RV32IにはR, I, S, B, U, Jの6つの形式の命令が存在しています。

//image[riscv-inst-types][RISC-Vの命令形式 @<bib>{isa-manual.1.2.3.enc}]

 : R形式
	ソースレジスタ(rs1, rs2)が2つ、デスティネーションレジスタ(rd)が1つの命令形式です。
	2つのソースレジスタの値を使って計算し、その結果をデスティネーションレジスタに格納します。
	例えばADD, SUB命令に使用されています。

 : I形式
	ソースレジスタ(rs1)が1つ、デスティネーションレジスタ(rd)が1つの命令形式です。
	12ビットの即値(imm[11:0])が命令中に含まれており、これとrs1を使って計算し、
	その結果をデスティネーションレジスタに格納します。
	例えばADDI, SUBI命令に使用されています。

 : S形式
	ソースレジスタ(rs1, rs2)が2つ、デスティネーションレジスタ(rd)が1つの命令形式です。
	12ビットの即値(imm[11:5], imm[4:0])が命令中に含まれており、
	これとソースレジスタを使って計算やメモリにアクセスし、
	その結果をデスティネーションレジスタに格納します。
	例えばSW命令(メモリにデータを格納する命令)に使用されています。

 : B形式
	ソースレジスタ(rs1, rs2)が2つの命令形式です。
	12ビットの即値(imm[12], imm[11], imm[10:5], imm[4:1])が命令中に含まれています。
	分岐命令に使用されており、
	ソースレジスタの計算の結果が分岐を成立させる場合、
	即値を使ってジャンプします。

 : U形式
	デスティネーションレジスタ(rd)が1つの命令形式です。
	20ビットの即値(imm[31:12])が命令中に含まれています。
	例えばLUI命令(レジスタの上位20ビットを設定する命令)に使用されています。

 : J形式
	デスティネーションレジスタ(rd)が1つの命令形式です。
	20ビットの即値(imm[20], imm[19:12], imm[11], imm[10:1])が命令中に含まれています。
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
        itype   : InstType   , // 命令の形式
        rwb_en  : logic      , // レジスタに書き込むかどうか
        is_lui  : logic      , // LUI命令である
        is_aluop: logic      , // ALUを利用する命令である
        is_jump : logic      , // ジャンプ命令である
        is_load : logic      , // ロード命令である
        funct3  : logic   <3>, // 命令のfunct3フィールド
        funct7  : logic   <7>, // 命令のfunct7フィールド
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
    const OP_LUI   : logic<7> = 7'b0110111;
    const OP_AUIPC : logic<7> = 7'b0010111;
    const OP_OP    : logic<7> = 7'b0110011;
    const OP_OP_IMM: logic<7> = 7'b0010011;
    const OP_JAL   : logic<7> = 7'b1101111;
    const OP_JALR  : logic<7> = 7'b1100111;
    const OP_BRANCH: logic<7> = 7'b1100011;
    const OP_LOAD  : logic<7> = 7'b0000011;
    const OP_STORE : logic<7> = 7'b0100011;
#@end
//}

これらの値とそれぞれの命令の対応については、
仕様書@<bib>{isa-manual.1.37}を確認してください。

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

    let imm_i: UIntX = {bits[31] repeat XLEN - $bits(imm_i_g), imm_i_g};
    let imm_s: UIntX = {bits[31] repeat XLEN - $bits(imm_s_g), imm_s_g};
    let imm_b: UIntX = {bits[31] repeat XLEN - $bits(imm_b_g) - 1, imm_b_g, 1'b0};
    let imm_u: UIntX = {bits[31] repeat XLEN - $bits(imm_u_g) - 12, imm_u_g, 12'b0};
    let imm_j: UIntX = {bits[31] repeat XLEN - $bits(imm_j_g) - 1, imm_j_g, 1'b0};

    let op: logic<7> = bits[6:0];
    let f7: logic<7> = bits[31:25];
    let f3: logic<3> = bits[14:12];

    const T: logic = 1'b1;
    const F: logic = 1'b0;

    always_comb {
        imm = case op {
            OP_LUI, OP_AUIPC: imm_u,
            OP_JAL          : imm_j,
            OP_JALR, OP_LOAD: imm_i,
            OP_OP_IMM       : imm_i,
            OP_BRANCH       : imm_b,
            OP_STORE        : imm_s,
            default         : 'x,
        };
        ctrl = {case op {
            OP_LUI   : {InstType::U, T, T, F, F, F},
            OP_AUIPC : {InstType::U, T, F, F, F, F},
            OP_JAL   : {InstType::J, T, F, F, T, F},
            OP_JALR  : {InstType::I, T, F, F, T, F},
            OP_BRANCH: {InstType::B, F, F, F, F, F},
            OP_LOAD  : {InstType::I, T, F, F, F, T},
            OP_STORE : {InstType::S, F, F, F, F, F},
            OP_OP    : {InstType::R, T, F, T, F, F},
            OP_OP_IMM: {InstType::I, T, F, T, F, F},
            default  : {InstType::X, F, F, F, F, F},
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
まず、命令のビット列から即値部分を取り出して、変数@<code>{imm_b_g}を生成します。
B形式の命令内に含まれている即値は12ビットで、最上位ビットは符号ビットです。
最上位ビットを繰り返す(符号拡張する)ことによって、32ビットの即値@<code>{imm_b}を生成します。

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
$ @<userinput>{make build}
$ @<userinput>{make sim}
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

これではテストする意味がないため、レジスタの値を適当な値に初期化します。@<fn>{reset.reg.error}

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

//footnote[reset.reg.error][「iは変数だからif_resetで使えません」のようなエラーが出る場合、申し訳ありませんがfor文を使わずに1つずつ初期化してください。]

//terminal[reg.debug][レジスタ読み込みのデバッグ]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim sample.hex 7}
00000000 : 01234567
  itype   : 000010
  imm     : 00000012
  rs1[ 6] : 0000006a
  rs2[18] : 00000076
00000004 : 89abcdef
  itype   : 100000
  imm     : fffbc09a
  rs1[23] : 0000007b
  rs2[26] : 0000007e
00000008 : deadbeef
  itype   : 100000
  imm     : fffdb5ea
  rs1[27] : 0000007f
  rs2[10] : 0000006e
0000000c : cafebebe
  itype   : 000000
  imm     : 00000000
  rs1[29] : 00000081
  rs2[15] : 00000073
//}

@<code>{01234567}は@<code>{jalr x10, 18(x6)}です。
JALR命令は、ソースレジスタ@<code>{x6}を使用します。
@<code>{x6}はレジスタ番号が@<code>{6}であることを表しており、
値は@<code>{106}になります。これは16進数で@<code>{6a}です。

シミュレーションと結果が一致していることを確認してください。

== ALUを作り、計算する

命令は足し算や引き算、ビット演算などの計算を行います。
計算の対象となるデータが揃ったので、ALU(計算する部品)を作成します。

=== ALUの作成

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

    let sll: UIntX = op1 << op2[4:0];
    let srl: UIntX = op1 >> op2[4:0];
    let sra: SIntX = $signed(op1) >>> op2[4:0];

    let slt : UIntX = {1'b0 repeat XLEN - 1, $signed(op1) <: $signed(op2)};
    let sltu: UIntX = {1'b0 repeat XLEN - 1, op1 <: op2};

    always_comb {
        if ctrl.is_aluop {
            case ctrl.funct3 {
                3'b000: result = if ctrl.itype == InstType::I | ctrl.funct7 == 0 {
                            add
                        } else {
                            sub
                        };
                3'b001: result = sll;
                3'b010: result = slt;
                3'b011: result = sltu;
                3'b100: result = op1 ^ op2;
                3'b101: result = if ctrl.funct7 == 0 {
                            srl
                        } else {
                            sra
                        };
                3'b110 : result = op1 | op2;
                3'b111 : result = op1 & op2;
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
仕様書で整数演算命令として定義されている命令@<bib>{isa-manual.1.2.4}は、
命令のfunct3@<table>{alu_funct3}, funct7フィールドによって計算の種類を特定することができます。

//table[alu_funct3][ALUの演算の種類]{
funct3			演算
---------------------------------
3'b000			加算、または減算
3'b001			左シフト
3'b010			符号あり <=
3'b011			符号なし <=
3'b100			ビット単位XOR
3'b101			右(論理|算術)シフト
3'b110			ビット単位OR
3'b111			ビット単位AND
//}

それ以外の命令は、足し算しか行いません。
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

=== ALUのテスト

最後にALUが正しく動くことを確認します。
@<code>{always_ff}ブロックで、
@<code>{op1}, @<code>{op2}, @<code>{alu_result}を表示します。

//list[core.veryl.alu.debug][ALUの結果表示 (core.veryl)]{
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
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim src/sample.hex 6}
00000000 : 02000093
  itype   : 000010
  imm     : 00000020
  rs1[ 0] : 00000000
  rs2[ 0] : 00000000
  op1     : 00000000
  op2     : 00000020
  alu res : 00000020
00000004 : 00100117
  itype   : 010000
  imm     : 00100000
  rs1[ 0] : 00000000
  rs2[ 1] : 00000065
  op1     : 00000004
  op2     : 00100000
  alu res : 00100004
00000008 : 002081b3
  itype   : 000001
  imm     : 00000000
  rs1[ 1] : 00000065
  rs2[ 2] : 00000066
  op1     : 00000065
  op2     : 00000066
  alu res : 000000cb
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
	@<code>{op1}はPCです。
	@<code>{op1}には、命令のアドレス@<code>{00000004}が表示されています。
	@<code>{op2}は即値です。
	@<code>{256}を12bit左にシフトした値@<code>{00100000}が表示されています。
	ALUの計算結果として、これを足した結果@<code>{00100004}が表示されています。

 : add x3, x1, x2
	@<code>{op1}は1番目のレジスタの値です。
	1番目のレジスタは@<code>{101}として初期化しているので、@<code>{00000065}と表示されています。
	2番目のレジスタは@<code>{102}として初期化しているので、@<code>{00000066}と表示されています。
	ALUの計算結果として、これを足した結果@<code>{000000cb}が表示されています。

== レジスタに結果を書き込む

CPUはレジスタから値を読み込み、これを計算して、レジスタに結果の値を書き戻します。
レジスタに値を書き戻すことを、ライトバックと言います。

ライトバックする値は、計算やメモリアクセスの結果です。
まだメモリにアクセスする処理を実装していませんが、先にライトバック処理を実装します。

=== ライトバックの実装

書き込む対象のレジスタは、命令の@<code>{rd}フィールドによって番号で指定します。
デコード時に、ライトバックする命令かどうかを@<code>{InstCtrl.rwb_en}に格納しています。
(inst_decoderモジュールを確認してください)

今のところ、
LUI命令のときは即値をそのまま、
それ以外の命令のときはALUの結果をライトバックするようにします。

//list[core.veryl.wb][ライトバック処理の実装 (core.veryl)]{
#@maprange(scripts/04/wb-range/core/src/core.veryl,wb)
    let rd_addr: logic<5> = inst_bits[11:7];
    let wb_data: UIntX    = if inst_ctrl.is_lui {
        inst_imm
    } else {
        alu_result
    };

    always_ff {
        if_reset {
            for i: i32 in 0..32 {
                regfile[i] = i + 100;
            }
        } else {
            if if_fifo_rvalid && inst_ctrl.rwb_en {
                regfile[rd_addr] = wb_data;
            }
        }
    }
#@end
//}

=== ライトバックのテスト

@<code>{always_ff}ブロックに、ライトバック処理の概要を表示するプログラムを記述します。
処理している命令がライトバックする命令のときにのみ、@<code>{$display}システムコールを呼び出します。

//list[core.veryl.wb.test][結果の表示 (core.veryl)]{
#@maprange(scripts/04/wb-range/core/src/core.veryl,debug)
    if inst_ctrl.rwb_en {
        $display("  reg[%d] <= %h", rd_addr, wb_data);
    }
#@end
//}

シミュレータを実行し、結果を確かめます。

//terminal[wb.test][ライトバックのデバッグ]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim sample.hex 6}
00000000 : 02000093
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  reg[ 1] <= 00000020
00000004 : 00100117
  itype     : 010000
  imm       : 00100000
  rs1[ 0]   : 00000000
  rs2[ 1]   : 00000020
  op1       : 00000004
  op2       : 00100000
  alu res   : 00100004
  reg[ 2] <= 00100004
00000008 : 002081b3
  itype     : 000001
  imm       : 00000000
  rs1[ 1]   : 00000020
  rs2[ 2]   : 00100004
  op1       : 00000020
  op2       : 00100004
  alu res   : 00100024
  reg[ 3] <= 00100024
//}

 : addi x1, x0, 32
    x1に、0と32を足した結果を格納しています。

 : auipc x2, 256
    x2に、PCと256を足した結果を格納しています。

 : add x3, x1, x2
    x1は1つ目の命令で@<code>{00000020}に、
    x2は2つ目の命令で@<code>{00100004}にされています。
    x3に、x1とx2を足した結果@<code>{00100024}を格納しています。

おめでとうございます！
このCPUは整数演算命令の実行ができるようになりました。

最後に、テストのためにレジスタの値を初期化するようにしていたコードを削除します。

//list[reg.remove.reset][レジスタの初期化をやめる (core.veryl)]{
#@maprange(scripts/04/wb-rm-reset-range/core/src/core.veryl,wb)
    always_ff {
        if if_fifo_rvalid && inst_ctrl.rwb_en {
            regfile[rd_addr] = wb_data;
        }
    }
#@end
//} 


== ロード命令とストア命令の実装

RV32Iには、メモリのデータをロードする(読み込む), 
ストアする(書き込む)命令として次の命令があります。

//table[ls.insts][ロード命令, ストア命令]{
命令	作用
-------------------------------------------------------------
LB		8ビットのデータを読み込む。上位24ビットは符号拡張する
LBU		8ビットのデータを読み込む。上位24ビットは0とする
LH		16ビットのデータを読み込む。上位16ビットは符号拡張する
LHU		16ビットのデータを読み込む。上位16ビットは0とする
LW		32ビットのデータを読み込む
SB		8ビットのデータを書き込む
SH		16ビットのデータを書き込む
SW		32ビットのデータを書き込む
//}

ロード命令はI形式、ストア命令はS形式です。
これらの命令で指定するメモリのアドレスは、rs1と即値の足し算です。
ALUに渡すデータがrs1と即値になっていることを確認してください(@<list>{core.reg.use})。
ストア命令は、rs2の値をメモリに格納します。

=== LW, SW命令の実装

8ビット, 16ビット単位で読み書きを行う命令の実装は少し大変です。
まず32ビット単位で読み書きを行うLW, SW命令を実装します。

==== memunitモジュールの作成

メモリ操作を行うモジュールを@<code>{memunit.veryl}に記述します。

//list[memunit.veryl.lwsw][memunit.veryl]{
#@mapfile(scripts/04/lwsw/core/src/memunit.veryl)
import eei::*;
import corectrl::*;

module memunit (
    clk   : input   clock                                    ,
    rst   : input   reset                                    ,
    valid : input   logic                                    ,
    is_new: input   logic                                    , // 命令が新しく供給されたかどうか
    ctrl  : input   InstCtrl                                 , // 命令のInstCtrl
    addr  : input   Addr                                     , // アクセスするアドレス
    rs2   : input   UIntX                                    , // ストア命令で書き込むデータ
    rdata : output  UIntX                                    , // ロード命令の結果 (stall = 0のときに有効)
    stall : output  logic                                    , // メモリアクセス命令が完了していない
    membus: modport membus_if::<MEM_DATA_WIDTH, XLEN>::master, // メモリとのinterface
) {

    // 命令がメモリにアクセスする命令か判別する関数
    function inst_is_memop (
        ctrl: input InstCtrl,
    ) -> logic    {
        return ctrl.itype == InstType::S || ctrl.is_load;
    }

    // 命令がストア命令か判別する関数
    function inst_is_store (
        ctrl: input InstCtrl,
    ) -> logic    {
        return inst_is_memop(ctrl) && !ctrl.is_load;
    }

    // memunitの状態を表す列挙型
    enum State: logic<2> {
        Init, // 命令を受け付ける状態
        WaitReady, // メモリが操作可能になるのを待つ状態
        WaitValid, // メモリ操作が終了するのを待つ状態
    }

    var state: State;

    var req_wen  : logic                ;
    var req_addr : Addr                 ;
    var req_wdata: logic<MEM_DATA_WIDTH>;

    always_comb {
        // メモリアクセス
        membus.valid = state == State::WaitReady;
        membus.addr  = req_addr;
        membus.wen   = req_wen;
        membus.wdata = req_wdata;
        // loadの結果
        rdata = membus.rdata;
        // stall判定
        stall = valid & case state {
            State::Init     : is_new && inst_is_memop(ctrl),
            State::WaitReady: 1,
            State::WaitValid: !membus.rvalid,
            default         : 0,
        };
    }

    always_ff {
        if_reset {
            state     = State::Init;
            req_wen   = 0;
            req_addr  = 0;
            req_wdata = 0;
        } else {
            if valid {
                case state {
                    State::Init: if is_new & inst_is_memop(ctrl) {
                        state     = State::WaitReady;
                        req_wen   = inst_is_store(ctrl);
                        req_addr  = addr;
                        req_wdata = rs2;
                    }
                    State::WaitReady: if membus.ready {
                        state = State::WaitValid;
                    }
                    State::WaitValid: if membus.rvalid {
                        state = State::Init;
                    }
                    default: {}
                }
            }
        }
    }
}
#@end
//}

memunitモジュールでは、
命令がメモリにアクセスする命令の時、
ALUから受け取ったアドレスをメモリに渡して操作を実行します。

命令がメモリにアクセスする命令かどうか  は。@<code>{inst_is_memop}関数で判定します。
ストア命令のとき、命令の形式はS形式です。
ロード命令のとき、デコーダは@<code>{InstCtrl.is_load}を@<code>{1}にしています。

memunitモジュールには、次の状態が定義されています。
初期状態は@<code>{State::Init}です。

 : State::Init
	memunitモジュールに新しく命令が供給されたとき、
	@<code>{valid}と@<code>{is_new}が@<code>{1}になります。
	新しく命令が供給されて、それがメモリにアクセスする命令のとき、
	状態を@<code>{State::WaitReady}に移動します。
	その際、@<code>{req_wen}にストア命令かどうか、
	@<code>{req_addr}にアクセスするアドレス、
	@<code>{req_wdata}に@<code>{rs2}を格納します。

 : State::WaitReady
	この状態の時、命令に応じた要求をメモリに送り続けます。
	メモリが要求を受け付ける(@<code>{ready})とき、
	状態を@<code>{State::WaitValid}に移動します。

 : State::WaitValid
	メモリに送信した要求の処理が終了した(@<code>{rvalid})とき、
	状態を@<code>{State::Init}に移動します。

メモリにアクセスする命令のとき、
memunitモジュールは@<code>{Init}, @<code>{WaitReady}, @<code>{WaitValid}の順で状態を移動するため、
実行には少なくとも3クロックが必要です。
その間、CPUはレジスタのライトバック処理やFIFOからの命令の取り出しを待つ必要があります。

これを実現するために、memunitモジュールには処理中かどうかを表す@<code>{stall}フラグが存在します。
有効な命令が供給されているとき、@<code>{state}やメモリの状態に応じて、次のように@<code>{stall}を決定します。

//table[stall.cond][stallの値の決定方法]{
状態	stallが1になる条件
-------------------------------------------------------------
Init		新しく命令が供給されて、それがメモリにアクセスする命令のとき
WaitReady	常に1
WaitValid	処理が終了していない(@<code>{!membus.rvalid})とき
//}


//caution[アドレスが4バイトに整列されていない場合の動作]{
今のところ、memoryモジュールはアドレスの下位2ビットを無視するため、
@<code>{addr}の下位2ビットが@<code>{00}ではない、
つまり、4で割り切れないアドレスに対してLW, SW命令を実行する場合、
memunitモジュールは正しい動作をしません。
2で割り切れないアドレスに対するLH, LHU, SH命令についても同様です。
これらの問題については後の章で対策するため、今は無視します。
//}


==== memunitモジュールのインスタンス化

coreモジュール内にmemunitモジュールをインスタンス化します。

まず、命令が供給されていることを示す信号@<code>{inst_valid}と、
命令が現在のクロックで供給されたことを示す信号@<code>{inst_is_new}を作成します。

//list[valid.new.inst][inst_valid, inst_is_newの定義 (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,valid_new)
    let inst_valid : logic    = if_fifo_rvalid;
    var inst_is_new: logic   ; // 命令が今のクロックで供給されたかどうか
#@end
//}

//list[inst_is_new.impl][inst_is_newの実装 (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,new_ff)
    always_ff {
        if_reset {
            inst_is_new = 0;
        } else {
            if if_fifo_rvalid {
                inst_is_new = if_fifo_rready;
            } else {
                inst_is_new = 1;
            }
        }
    }
#@end
//}

命令が供給されているかどうかは、@<code>{if_fifo_rvalid}と同値です。
これを機に、@<code>{if_fifo_rvalid}を使用しているところを@<code>{inst_valid}に置き換えましょう。

命令が現在のクロックで供給されたかどうかは、FIFOの@<code>{rvalid}, @<code>{rready}を観測することでわかります。
@<code>{rvalid}が@<code>{1}のとき、@<code>{ready}が@<code>{1}なら、次のクロックで供給される命令は新しく供給される命令です。
@<code>{ready}が@<code>{0}なら、次のクロックで供給されている命令は現在のクロックと同じ命令になります。
@<code>{rvalid}が@<code>{0}のとき、次のクロックで供給される命令は常に新しく供給される命令になります。
(次のクロックで@<code>{rvalid}が@<code>{1}かどうかについては考えません)

さて、memunitモジュールをインスタンス化する前に、メモリとの接続方法について考える必要があります。

coreモジュールには、メモリとの接続点としてmembusポートが存在します。
しかし、これは命令フェッチ用に使用されているため、
memunitモジュール用に使用することができません。
また、memoryモジュールは同時に2つの操作を受け付けることができません。

この問題を、coreモジュールにメモリとの接続点を2つ用意し、それをtopモジュールで調停することにより回避します。

//list[core.membus.two][coreモジュールのポート定義 (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,port)
module core (
    clk     : input   clock                                    ,
    rst     : input   reset                                    ,
    i_membus: modport membus_if::<ILEN, XLEN>::master          ,
    d_membus: modport membus_if::<MEM_DATA_WIDTH, XLEN>::master,
) {
#@end
//}


まず、coreモジュールに、命令フェッチ用のポート@<code>{i_membus}, ロードストア命令用のポート@<code>{d_membus}の2つのポートを用意します。
命令フェッチ用のポートが@<code>{membus}から@<code>{i_membus}に変更されるため、
既存の@<code>{membus}を@<code>{i_membus}に置き換えてください。

//list[membus.to.i_membus][membusをi_membusに置き換える (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,fetch)
    // FIFOに空きがあるとき、命令をフェッチする
    i_membus.valid = if_fifo_wready;
    i_membus.addr  = if_pc;
    i_membus.wen   = 0;
    i_membus.wdata = 'x; // wdataは使用しない
#@end
//}

次に、topモジュールでの調停を実装します。

//list[top.arb][メモリへのアクセス要求の調停 (top.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/top.veryl,arb)
    inst membus  : membus_if::<MEM_DATA_WIDTH, 20>;
    inst i_membus: membus_if::<ILEN, XLEN>; // 命令フェッチ用
    inst d_membus: membus_if::<MEM_DATA_WIDTH, XLEN>; // ロードストア命令用

    var memarb_last_i: logic;

    // メモリアクセスを調停する
    always_ff {
        if_reset {
            memarb_last_i = 0;
        } else {
            if membus.ready {
                memarb_last_i = !d_membus.valid;
            }
        }
    }

    always_comb {
        i_membus.ready  = membus.ready && !d_membus.valid;
        i_membus.rvalid = membus.rvalid && memarb_last_i;
        i_membus.rdata  = membus.rdata;

        d_membus.ready  = membus.ready;
        d_membus.rvalid = membus.rvalid && !memarb_last_i;
        d_membus.rdata  = membus.rdata;

        membus.valid = i_membus.valid | d_membus.valid;
        if d_membus.valid {
            membus.addr  = addr_to_memaddr(d_membus.addr);
            membus.wen   = d_membus.wen;
            membus.wdata = d_membus.wdata;
        } else {
            membus.addr  = addr_to_memaddr(i_membus.addr);
            membus.wen   = 0; // 命令フェッチは常に読み込み
            membus.wdata = 'x;
        }
    }
#@end
//}

新しく、@<code>{i_membus}と@<code>{d_membus}をインスタンス化し、
それを@<code>{membus}と接続します。

調停の仕組みは次のとおりです。

 * @<code>{i_membus}と@<code>{d_membus}の両方の@<code>{valid}が@<code>{1}のとき、@<code>{d_membus}を優先する
 * @<code>{memarb_last_i}レジスタに、受け入れた要求が@<code>{i_membus}からのものだったかどうかを記録する
 * メモリが要求の結果を返すとき、@<code>{memarb_last_i}を見て、@<code>{i_membus}と@<code>{d_membus}のどちらか片方の@<code>{rvalid}を@<code>{1}にする

命令フェッチを優先していると命令の処理が進まないため、
@<code>{i_membus}よりも@<code>{d_membus}を優先します。

coreモジュールとの接続を次のように変更します。

//list[membus.core_inst][membusを2つに分けて接続する (top.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/top.veryl,core_inst)
    inst c: core (
        clk       ,
        rst       ,
        i_membus  ,
        d_membus  ,
    );
#@end
//}

memoryモジュールとmemunitを接続する準備が整ったので、memunitモジュールをインスタンス化します。

//list[core.memunit.inst][memunitモジュールのインスタンス化 (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,inst)
    var memu_rdata: UIntX;
    var memu_stall: logic;

    inst memu: memunit (
        clk                ,
        rst                ,
        valid : inst_valid ,
        is_new: inst_is_new,
        ctrl  : inst_ctrl  ,
        addr  : alu_result ,
        rs2   : rs2_data   ,
        rdata : memu_rdata ,
        stall : memu_stall ,
        membus: d_membus   ,
    );
#@end
//}


==== memunitモジュールの処理待ちとライトバック

最後に、
memunitモジュールが処理中は命令をFIFOから取り出すのを止める処理と、
LW命令で読み込んだデータがレジスタにライトバックする処理を実装します。

//list[membus.rready][memunitモジュールの処理が終わるのを待つ (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,rready)
    // memunitが処理中ではないとき、FIFOから命令を取り出していい
    if_fifo_rready = !memu_stall;
#@end
//}

//list[membus.wb][memunitモジュールの結果をライトバックする (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,rd)
    let rd_addr: logic<5> = inst_bits[11:7];
    let wb_data: UIntX    = if inst_ctrl.is_lui {
        inst_imm
    } else if inst_ctrl.is_load {
        memu_rdata
    } else {
        alu_result
    };
#@end
//}

memunitモジュールが処理中のとき、@<code>{memu_stall}が@<code>{1}になっています。
そのため、@<code>{memu_stall}が@<code>{1}のときは、
@<code>{if_fifo_rready}を@<code>{0}にすることで、
FIFOからの命令の取り出しを停止します。

ライトバック処理では、命令がロード命令のとき(@<code>{inst_ctrl.is_load})、
@<code>{alu_result}ではなく@<code>{memu_rdata}を@<code>{wb_data}に設定します。

ところで、現在のプログラムでは、memunitの処理が終了していないときもライトバックをし続けています。
レジスタへのライトバックは命令の実行が終了したときのみで良いため、次のようにプログラムを変更します。

//list[wb.ready.main][命令の実行が終了したときにのみライトバックする (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,wb_ready)
    always_ff {
        if inst_valid && if_fifo_rready && inst_ctrl.rwb_en {
            regfile[rd_addr] = wb_data;
        }
    }
#@end
//}

//list[wb.ready.debug][ライトバックするときにのみデバッグ表示する (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,wb_debug)
    if if_fifo_rready && inst_ctrl.rwb_en {
        $display("  reg[%d] <= %h", rd_addr, wb_data);
    }
#@end
//}

==== LW, SW命令のテスト

LW, SW命令が正しく動作していることを確認するために、デバッグ出力を次のように変更します。

//list[debug.memunit.stall.rdata][メモリモジュールの状態を出力する (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,mem)
    $display("  mem stall : %b", memu_stall);
    $display("  mem rdata : %h", memu_rdata);
#@end
//}

また、ここからのテストは実行するクロック数が多くなるため、
ログに何クロック目かを表示することで、ログを読みやすくします。

//list[log.count][何クロック目かを出力する (core.veryl)]{
#@maprange(scripts/04/lwsw-range/core/src/core.veryl,clock_count)
    var clock_count: u64;

    always_ff {
        if_reset {
            clock_count = 1;
        } else {
            clock_count = clock_count + 1;
            if inst_valid {
                $display("# %d", clock_count);
                $display("%h : %h", inst_pc, inst_bits);
                $display("  itype     : %b", inst_ctrl.itype);
#@end
//}

LW, SW命令のテストのために、sample.hexを次のように変更します。

//list[sample.hex.lwsw][テスト用のプログラムを記述する (sample.hex)]{
#@mapfile(scripts/04/lwsw-range/core/src/sample.hex)
02002503 // lw x10, 0x20(x0)
40000593 // addi x11, x0, 0x400
02b02023 // sw x11, 0x20(x0)
02002603 // lw x12, 0x20(x0)
00000000
00000000
00000000
00000000
deadbeef // 0x20
#@end
//}

プログラムは次のようになっています。

//table[sample.hex.lwsw][メモリに格納するデータ]{
アドレス	命令	意味
-------------------------------------------------------------
00000000	lw x10, 0x20(x0)	x10に、アドレスが0x20のデータを読み込む
00000004	addi x11, x0, 0x400	x11 = 0x400		
00000008	sw x11, 0x20(x0)	アドレス0x20にx11の値を書き込む
0000000c	lw x12, 0x20(x0)	x12に、アドレスが0x20のデータを読み込む
//}

アドレス@<code>{0x20}には、データ@<code>{deadbeef}を格納しています。

シミュレータを実行し、結果を確かめます。

//terminal[lwsw.test][LW, SW命令のテスト]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim src/sample.hex 13}
#                    3
00000000 : 02002503
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  mem stall : 1 @<balloon>{LW命令でストールしている}
  mem rdata : 02b02023
(省略)
#                    5
00000000 : 02002503
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  mem stall : 0 @<balloon>{LWが終わったので0になった}
  mem rdata : deadbeef
  reg[10] <= deadbeef @<balloon>{0x20の値が読み込まれた}
(省略)
#                   12
0000000c : 02002603
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  mem stall : 0
  mem rdata : 00000400
  reg[12] <= 00000400 @<balloon>{書き込んだ値が読み込まれた}
//}


=== LB, LBU, LH, LHU命令の実装

LB, LBU, SB命令は8ビット単位、LH, LHU, SH命令は16ビット単位でロード/ストアを行う命令です。

まずロード命令を実装します。
ロード命令は32ビット単位でデータを読み込み、
その結果の一部を切り取ることで実装することができます。

まず、何度も記述することになる定数と変数を短い名前(@<code>{W}, @<code>{D})で定義します。

//list[lbhsbh.wd][WとDの定義 (memunit.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/memunit.veryl,wd)
    const W   : u32                   = XLEN;
    let D   : logic<MEM_DATA_WIDTH> = membus.rdata;
    let sext: logic                 = ctrl.funct3[2] == 1'b0;
#@end
//}

LB, LBU, LH, LHU, LW命令は、funct3の値で区別することができます。

//table[funct3.load][ロード命令のfunct3]{
funct3	命令
-------------------------------------------------------------
000		LB
100		LBU
001		LH
101		LHU
010		LW
//}

funct3をcase文で分岐し、
アドレスの下位ビットを見ることで、
命令とアドレスに応じた値をrdataに設定します。

//list[lbhsbh.rdata][rdataをアドレスと読み込みサイズに応じて変更する (memunit.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/memunit.veryl,load)
    // loadの結果
    rdata = case ctrl.funct3[1:0] {
        2'b00  : case addr[1:0] {
            0      : {sext & D[7] repeat W - 8, D[7:0]},
            1      : {sext & D[15] repeat W - 8, D[15:8]},
            2      : {sext & D[23] repeat W - 8, D[23:16]},
            3      : {sext & D[31] repeat W - 8, D[31:24]},
            default: 'x,
        },
        2'b01  : case addr[1:0] {
            0      : {sext & D[15] repeat W - 16, D[15:0]},
            2      : {sext & D[31] repeat W - 16, D[31:16]},
            default: 'x,
        },
        2'b10  : D,
        default: 'x,
    };
#@end
//}

=== SB, SH命令の実装

次に、SB, SH命令を実装します。

==== memoryモジュールで書き込みマスクをサポートする

memoryモジュールは、32ビット単位の読み書きしかサポートしておらず、
一部の書き込みもサポートしていません。
本書では、一部のみ書き込む命令をmemoryモジュールでサポートすることで、SB, SH命令を実装します。

まず、membus_ifインターフェースに、書き込む場所をバイト単位で示す信号@<code>{wmask}を追加します。
@<code>{wmask}には、書き込む部分を1、書き込まない部分を0で指定します。
このような挙動をする値を、書き込みマスクと呼びます。

//list[wmask.define][wmaskの定義 (membus_if.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/membus_if.veryl,wmask)
    var wmask : logic<DATA_WIDTH / 8>;
#@end
//}

//list[wmask.master][modport masterにwmaskを追加する (membus_if.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/membus_if.veryl,master)
    modport master {
        ...
        @<b>|wmask : output,|
        ...
    }
#@end
//}

//list[wmask.slave][modport slaveにwmaskを追加する (membus_if.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/membus_if.veryl,slave)
    modport slave {
        ...
        @<b>|wmask : input ,|
        ...
    }
#@end
//}

バイト単位で指定するため、@<code>{wmask}の幅は4ビットです。

次に、memoryモジュールで書き込みマスクをサポートします。

//list[wmask.memory][書き込みマスクをサポートするmemoryモジュール (memory.veryl)]{
#@mapfile(scripts/04/lbhsbh/core/src/memory.veryl)
module memory::<DATA_WIDTH: const, ADDR_WIDTH: const> (
    clk      : input   clock                                     ,
    rst      : input   reset                                     ,
    membus   : modport membus_if::<DATA_WIDTH, ADDR_WIDTH>::slave,
    FILE_PATH: input   string                                    , // メモリの初期値が格納されたファイルのパス
) {
    type DataType = logic<DATA_WIDTH>    ;
    type MaskType = logic<DATA_WIDTH / 8>;

    var mem: DataType [2 ** ADDR_WIDTH];

    // 書き込みマスクをDATA_WIDTHに展開した値
    var wmask_expand: DataType;
    for i in 0..DATA_WIDTH :wm_expand_block {
        assign wmask_expand[i] = wmask_saved[i / 8];
    }

    initial {
        // memをFILE_PATHに格納されているデータで初期化
        if FILE_PATH != "" {
            $readmemh(FILE_PATH, mem);
        }
    }

    // 状態
    enum State {
        Ready,
        WriteValid,
    }
    var state: State;

    var addr_saved : logic   <ADDR_WIDTH>;
    var wdata_saved: DataType            ;
    var wmask_saved: MaskType            ;
    var rdata_saved: DataType            ;

    always_comb {
        membus.ready = state == State::Ready;
    }

    always_ff {
        if state == State::WriteValid {
            mem[addr_saved[ADDR_WIDTH - 1:0]] = wdata_saved & wmask_expand | rdata_saved & ~wmask_expand;
        }
    }

    always_ff {
        if_reset {
            state         = State::Ready;
            membus.rvalid = 0;
            membus.rdata  = 0;
            addr_saved    = 0;
            wdata_saved   = 0;
            wmask_saved   = 0;
            rdata_saved   = 0;
        } else {
            case state {
                State::Ready: {
                                  membus.rvalid = membus.valid & !membus.wen;
                                  membus.rdata  = mem[membus.addr[ADDR_WIDTH - 1:0]];
                                  addr_saved    = membus.addr[ADDR_WIDTH - 1:0];
                                  wdata_saved   = membus.wdata;
                                  wmask_saved   = membus.wmask;
                                  rdata_saved   = mem[membus.addr[ADDR_WIDTH - 1:0]];
                                  if membus.valid && membus.wen {
                                      state = State::WriteValid;
                                  }
                              }
                State::WriteValid: {
                                       state         = State::Ready;
                                       membus.rvalid = 1;
                                   }
            }
        }
    }
}
#@end
//}

書き込みマスクをサポートするmemoryモジュールは、次の2つの状態を持ちます。

 : State::Ready
	要求を受け付ける。
	読み込み要求のとき、次のクロックで結果を返す。
	書き込み要求のとき、要求の内容をレジスタに保存し、
	状態を@<code>{State::WriteValid}に移動する。

 : State::WriteValid
	書き込みマスクつきの書き込みを行う。
	状態を@<code>{State::Ready}に移動する。

memoryモジュールは、書き込み要求が送られてきた場合、
名前が@<code>{_saved}で終わるレジスタに要求の内容を保存します。
また、@<code>{rdata_saved}に、指定されたアドレスのデータを保存します。
次のクロックで、書き込みマスクを使った書き込みを行い、要求の処理を終了します。

topモジュールの調停処理で、@<code>{wmask}も調停するようにします。

//list[top.wmask][wmaskの設定 (top.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/top.veryl,wmask)
    membus.valid = i_membus.valid | d_membus.valid;
    if d_membus.valid {
        membus.addr  = addr_to_memaddr(d_membus.addr);
        membus.wen   = d_membus.wen;
        membus.wdata = d_membus.wdata;
        @<b>|membus.wmask = d_membus.wmask;|
    } else {
        membus.addr  = addr_to_memaddr(i_membus.addr);
        membus.wen   = 0; // 命令フェッチは常に読み込み
        membus.wdata = 'x;
        @<b>|membus.wmask = 'x;|
    }
#@end
//}

==== memunitモジュールの実装

memoryモジュールが書き込みマスクをサポートするようになったので、
memunitモジュールでwmaskを設定します。

@<code>{req_wmask}レジスタを作成し、@<code>{membus.wmask}と接続します。

//list[memu.wmask.define][req_wmaskの定義 (memunit.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/memunit.veryl,def_wmask)
    var req_wmask: logic<MEM_DATA_WIDTH / 8>;
#@end
//}

//list[memu.wmask.use][membusにwmaskを設定する (memunit.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/memunit.veryl,mem_wmask)
    // メモリアクセス
    membus.valid = state == State::WaitReady;
    membus.addr  = req_addr;
    membus.wen   = req_wen;
    membus.wdata = req_wdata;
    @<b>|membus.wmask = req_wmask;|
#@end
//}

@<code>{always_ff}の中で、req_wmaskの値を設定します。
それぞれの命令のとき、wmaskがどうなるかを確認してください。

//list[memu.wmask.init][if_resetでreq_wmaskを初期化する (memunit.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/memunit.veryl,always_reset)
    if_reset {
        state     = State::Init;
        req_wen   = 0;
        req_addr  = 0;
        req_wdata = 0;
        @<b>|req_wmask = 0;|
    } else {
#@end
//}

//list[memu.wmask.set][メモリにアクセスする命令のとき、wmaskを設定する (memunit.veryl)]{
#@maprange(scripts/04/lbhsbh-range/core/src/memunit.veryl,always_wmask)
    req_wmask = case ctrl.funct3[1:0] {
        2'b00  : 4'b1 << addr[1:0], @<balloon>{LB, LBUのとき、アドレス下位2ビット分だけ1を左シフトする}
        2'b01  : case addr[1:0] { @<balloon>{LH, LHU命令のとき}
            2      : 4'b1100, @<balloon>{上位2バイトに書き込む}
            0      : 4'b0011, @<balloon>{下位2バイトに書き込む}
            default: 'x,
        },
        2'b10  : 4'b1111, @<balloon>{LW命令のとき、全体に書き込む}
        default: 'x,
    };
#@end
//}

=== LB, LBU, LH, LHU, SB, SH命令のテスト

簡単なテストを作成し、動作をテストします。

2つテストを記載するので、正しく動いているか確認してください。

//list[sample_lbh.hex][src/sample_lbh.hex]{
#@mapfile(scripts/04/lbhsbh/core/src/sample_lbh.hex)
02000083 // lb x1, 0x20(x0)  : x1 = ffffffef
02104083 // lbu x1, 0x21(x0) : x1 = 000000be
02201083 // lh x1, 0x22(x0)  : x1 = ffffdead
02205083 // lhu x1, 0x22(x0) : x1 = 0000dead
00000000
00000000
00000000
00000000
deadbeef // 0x0
#@end
//}

//list[sample_sbsh.hex][src/sample_sbsh.hex]{
#@mapfile(scripts/04/lbhsbh/core/src/sample_sbsh.hex)
12300093 // addi x1, x0, 0x123
02101023 // sh x1, 0x20(x0)
02100123 // sb x1, 0x22(x0)
02200103 // lb x2, 0x22(x0) : x2 = 00000023
02001183 // lh x3, 0x20(x0) : x3 = 00000123
#@end
//}

== ジャンプ命令、分岐命令の実装

まだ、重要な命令を実装できていません。
プログラムでif文やループを実現するためには、ジャンプや分岐をする命令が必要です。
RV32Iには、仕様書@<bib>{isa-manual.1.2.5}に次の命令が定義されています。

//table[jump.br.insts][ジャンプ命令, 分岐命令]{
命令	形式	動作
-------------------------------------------------------------
JAL		J形式	PC+即値に無条件ジャンプする。rdにPC+4を格納する
JALR	I形式	rs1+即値に無条件ジャンプする。rdにPC+4を格納する
BEQ		B形式	rs1とrs2が等しいとき、PC+即値にジャンプする
BNE		B形式	rs1とrs2が異なるとき、PC+即値にジャンプする
BLT		B形式	rs1(符号付き整数)がrs2(符号付き整数)より小さいとき、PC+即値にジャンプする
BLTU	B形式	rs1(符号なし整数)がrs2(符号なし整数)より小さいとき、PC+即値にジャンプする
BGE		B形式	rs1(符号付き整数)がrs2(符号付き整数)より大きいとき、PC+即値にジャンプする
BGEU	B形式	rs1(符号なし整数)がrs2(符号なし整数)より大きいとき、PC+即値にジャンプする
//}

ジャンプ命令は、無条件でジャンプするため、無条件ジャンプ(Unconditional Jump)と呼びます。
分岐命令は、条件付きで分岐するため、条件分岐(Conditional Branch)と呼びます。

=== JAL, JALR命令

まず、無条件ジャンプを実装します。

JAL(Jump And Link)命令は、PC+即値でジャンプ先を指定します。
ここでLinkとは、rdレジスタにPC+4を記録しておくことで、分岐元に戻れるようにしておく操作のことを指しています。
即値の幅は20ビットです。
PCの下位1ビットは常に0なため、即値を1ビット左シフトして符号拡張した値をPCに加算します。
(即値の生成についてはinst_decoderモジュールを確認してください)
JAL命令でジャンプ可能な範囲は、PC±1MiBです。

JALR (Jump And Link Register)命令は、rs1+即値でジャンプ先を指定します。
即値はI形式の即値です。
JAL命令と同様に、rdレジスタにPC+4を格納します。
JALR命令でジャンプ可能な範囲は、rs1レジスタの値±4KiBです。

inst_decoderモジュールは、JAL命令、JALR命令を次のようにデコードしています。

 * @<code>{InstCtrl.is_jump} = 1
 * @<code>{InstCtrl.is_aluop} = 0

無条件ジャンプであるかどうかは@<code>{InstCtrl.is_jump}で確かめることができます。
また、@<code>{InstCtrl.is_aluop}が@<code>{0}なため、ALUは常に加算を行います。
加算の対象のデータが、JAL命令(J形式)ならPCと即値, JALR命令(I形式)ならrs1と即値になっていることを確認してください(@<list>{core.veryl.alu.data})。

==== 無条件ジャンプの実装

それでは、無条件ジャンプを実装します。
まず、ジャンプ命令を実行するとき、ライトバックする値を@<code>{inst_pc + 4}にします。

//list[jump.wb][pc + 4を書き込む (core.veryl)]{
#@maprange(scripts/04/jump-range/core/src/core.veryl,wb)
    let wb_data: UIntX    = if inst_ctrl.is_lui {
        inst_imm
    } else if inst_ctrl.is_jump {
        inst_pc + 4
    } else if inst_ctrl.is_load {
        memu_rdata
    } else {
        alu_result
    };
#@end
//}

次に、次にフェッチする命令をジャンプ先の命令に変更します。
そのために、フェッチ先の変更が発生したことを表す信号@<code>{control_hazard}と、
新しいフェッチ先を示す信号@<code>{control_hazard_pc_next}を作成します。

//list[jump.ch][control_hazardとcontrol_hazard_pc_nextの定義 (core.veryl)]{
#@# #@maprange(scripts/04/jump-range/core/src/core.veryl,hazard)
    let control_hazard        : logic = inst_valid && inst_ctrl.is_jump;
    let control_hazard_pc_next: Addr  = alu_result;
#@# #@end
TODO
//}

@<code>{control_hazard}を利用して、@<code>{if_pc}を更新し、新しく命令をフェッチしなおすようにします。

//list[jump.always][PCを変更する (core.veryl)]{
#@maprange(scripts/04/jump-range/core/src/core.veryl,always)
    always_ff {
        if_reset {
            ...
        } else {
            if control_hazard {
                if_pc           = control_hazard_pc_next;
                if_is_requested = 0;
                if_fifo_wvalid  = 0;
            } else {
                if if_is_requested {
                    ...
                }
                // IFのFIFOの制御
                if if_is_requested && i_membus.rvalid {
                    ...
                }
            }
        }
    }
#@end
//}

ここで、新しく命令をフェッチしなおすようにしても、
ジャンプ命令によって実行されることがなくなった命令がFIFOに残っていることがあることに注意する必要があります。
実行しない命令を実行しないようにするために、
ジャンプ命令を実行するときに、FIFOをリセットするようにします。

FIFOに、内容をリセットするための信号@<code>{flush}を追加します。

//list[jump.fifo.port][ポートにflushを追加する (fifo.veryl)]{
#@maprange(scripts/04/jump-range/core/src/fifo.veryl,port)
    flush : input  logic    ,
#@end
//}

//list[jump.fifo.always][flushが1のとき、FIFOを空にする (fifo.veryl)]{
#@maprange(scripts/04/jump-range/core/src/fifo.veryl,always)
    always_ff {
        if_reset {
            head = 0;
            tail = 0;
        } else {
            if flush {
                head = 0;
                tail = 0;
            } else {
                if wready && wvalid {
                    mem[tail] = wdata;
                    tail      = tail + 1;
                }
                if rready && rvalid {
                    head = head + 1;
                }
            }
        }
    }
#@end
//}

coreモジュールで、@<code>{control_hazard}が@<code>{1}のときに、
FIFOをリセットするようにします。

//list[jump.fifo.core][ジャンプ命令のとき、FIFOをリセットする (core.veryl)]{
#@maprange(scripts/04/jump-range/core/src/core.veryl,fifo)
    inst if_fifo: fifo #(
        DATA_TYPE: if_fifo_type,
        WIDTH    : 3           ,
    ) (
        clk                   ,
        rst                   ,
        flush : control_hazard, @<balloon>{追加}
        ...
    );
#@end
//}

==== 無条件ジャンプのテスト

簡単なテストを作成し、動作をテストします。

//list[jump.test.hex][sample_jump.hex]{
#@mapfile(scripts/04/jump-range/core/src/sample_jump.hex)
0100006f //  0: jal x0, 0x10 : 0x10にジャンプする
deadbeef //  4:
deadbeef //  8:
deadbeef //  c:
01800093 // 10: addi x1, x0, 0x18
00808067 // 14: jalr x0, 8(x1) : x1+8=0x20にジャンプする
deadbeef // 18:
deadbeef // 1c:
fe1ff06f // 20: jal x0, -0x20 : 0にジャンプする
#@end
//}

//terminal[jump.test][テストの実行 (一部省略)]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim src/sample_jump.hex 17}
#                    4
00000000 : 0100006f
  reg[ 0] <= 00000004 @<balloon>{rd = PC + 4}
#                    8
00000010 : 01800093 @<balloon>{0x00 -> 0x10にジャンプしている}
  reg[ 1] <= 00000018
#                    9
00000014 : 00808067
  reg[ 0] <= 00000018 @<balloon>{rd = PC + 4}
#                   13
00000020 : fe1ff06f @<balloon>{0x14 -> 0x20にジャンプしている}
  reg[ 0] <= 00000024 @<balloon>{rd = PC + 4}
#                   17
00000000 : 0100006f @<balloon>{0x20 -> 0x00にジャンプしている}
  reg[ 0] <= 00000004
//}

無条件ジャンプを正しく実行できていることを確認することができます。

=== 条件分岐命令

条件分岐命令はすべてB形式で、PC+即値で分岐先を指定します。
それぞれの命令は、命令のfunct3フィールドで判別することができます。

//table[br.funct3][条件分岐命令とfunct3]{
funct3	命令	演算
-------------------------------------------------------------
000		BEQ		==
001		BNE		!=
100		BLT		符号あり <=
101		BGE		符号あり >
110		BLTU	符号なし <=
111		BGEU	符号なし >
//}

==== 条件分岐命令の実装

まず、分岐するかどうかの判定を行うモジュールを作成します。

@<code>{src/brunit.veryl}を作成し、次のように記述します。

//list[brunit.veryl][brunit.veryl]{
#@mapfile(scripts/04/br-range/core/src/brunit.veryl)
import eei::*;
import corectrl::*;

module brunit (
    funct3: input  logic<3>,
    op1   : input  UIntX   ,
    op2   : input  UIntX   ,
    take  : output logic   , // 分岐が成立するか否か
) {
    let beq : logic = op1 == op2;
    let blt : logic = $signed(op1) <: $signed(op2);
    let bltu: logic = op1 <: op2;

    always_comb {
        case funct3 {
            3'b000 : take = beq;
            3'b001 : take = !beq;
            3'b100 : take = blt;
            3'b101 : take = !blt;
            3'b110 : take = bltu;
            3'b111 : take = !bltu;
            default: take = 0;
        }
    }
}
#@end
//}

brunitモジュールは、@<code>{funct3}に応じて@<code>{take}の条件を切り替えます。
分岐が成立するとき、@<code>{take}は@<code>{1}になります。

brunitモジュールを、coreモジュールでインスタンス化します。

//list[inst.brunit][brunitのインスタンス化 (core.veryl)]{
#@maprange(scripts/04/br-range/core/src/core.veryl,inst)
    var brunit_take: logic;

    inst bru: brunit (
        funct3: inst_ctrl.funct3,
        op1                     ,
        op2                     ,
        take  : brunit_take     ,
    );
#@end
//}

命令がB形式のとき、@<code>{op1}は@<code>{rs1_data}、
@<code>{op2}は@<code>{rs2_data}になっていることを確認してください(@<list>{core.veryl.alu.data})。

命令が条件分岐命令で、@<code>{brunit_take}が@<code>{1}のとき、次のPCをPC + 即値にするようにします。

//list[br.function][命令が条件分岐命令か判定する関数 (core.veryl)]{
#@maprange(scripts/04/br-range/core/src/core.veryl,function)
    // 命令が分岐命令かどうかを判定する
    function inst_is_br (
        ctrl: input InstCtrl,
    ) -> logic    {
        return ctrl.itype == InstType::B;
    }
#@end
//}

//list[br.hazard][分岐成立時のPCの設定 (core.veryl)]{
#@maprange(scripts/04/br-range/core/src/core.veryl,hazard)
    assign control_hazard         = inst_valid && (inst_ctrl.is_jump || inst_is_br(inst_ctrl) && brunit_take);
    assign control_hazard_pc_next = if inst_is_br(inst_ctrl) {
        inst_pc + inst_imm
    } else {
        alu_result
    };
#@end
//}

@<code>{control_hazard}は、命令が無条件ジャンプ命令か、命令が条件分岐命令かつ分岐が成立するときに@<code>{1}になります。
@<code>{control_hazard_pc_next}は、無条件ジャンプ命令のときは@<code>{alu_result}、条件分岐命令のときはPC + 即値になります。

==== 条件分岐命令のテスト

条件分岐命令を実行するとき、分岐の成否を表示するようにします。
デバッグ表示を行っている@<code>{always_ff}ブロック内に、次のプログラムを追加します。

//list[br.debug][デバッグ表示 (core.veryl)]{
#@maprange(scripts/04/br-range/core/src/core.veryl,debug)
    if inst_is_br(inst_ctrl) {
        $display("  br take   : %b", brunit_take);
    }
#@end
//}

簡単なテストを作成し、動作をテストします。

//list[sample_br.hex][sample_br.hex]{
#@mapfile(scripts/04/br-range/core/src/sample_br.hex)
00100093 //  0: addi x1, x0, 1
10100063 //  4: beq x0, x1, 0x100
00101863 //  8: bne x0, x1, 0x10
deadbeef //  c:
deadbeef // 10:
deadbeef // 14:
0000d063 // 18: bge x1, x0, 0
#@end
//}

//terminal[br.test][テストの実行 (一部省略)]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{obj_dir/sim src/sample_br.hex 15}
#                    4
00000000 : 00100093
  reg[ 1] <= 00000001 @<balloon>{x1に1を代入}
#                    5
00000004 : 10100063
  op1       : 00000000
  op2       : 00000001
  br take   : 0 @<balloon>{x0 != x1なので不成立}
#                    6
00000008 : 00101863
  op1       : 00000000
  op2       : 00000001
  br take   : 1 @<balloon>{x0 != x1なので成立}
#                   10
00000018 : 0000d063 @<balloon>{0x08 -> 0x18にジャンプ}
  br take   : 1 @<balloon>{x1 > x0なので成立}
#                   14
00000018 : 0000d063 @<balloon>{0x18 -> 0x18にジャンプ}
  br take   : 1
//}

BLT, BLTU, BGEU命令についてはテストできていませんが、後の章で紹介するriscv-testsでテストします。

これでRV32Iの実装は終わりです。
お疲れ様でした。

//caution[実装していないRV32Iの命令について]{
本章ではメモリフェンス命令, ECALL, EBREAK命令などを実装していません。
これらの命令は後の章で実装します。
//}