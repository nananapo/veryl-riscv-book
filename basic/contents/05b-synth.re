= CPUの合成

これまでの章では、RV64IのCPUを作成してパイプライン化しました。
今までは動作確認とテストはシミュレータで行っていましたが、
本章では実機(FPGA)でCPUを動かします。

//image[pynq_z1][PYNQ-Z1][width=30%]

== FPGAとは何か？

集積回路を製造するには手間と時間とお金が必要です。
FPGAを使うと、少しの手間と少しの時間、安価に集積回路の実現をお試しすることができます。

@<b>{FPGA}(Field Programmable Gate Array)は、
任意の論理回路を実現することができる集積回路のことです。
ハードウェア記述言語で設計した論理回路をFPGA上に設定することで、
実際に集積回路を製造しなくても実機で論理回路を再現できます。

「任意の論理回路を実現することができる集積回路」は、
主にプロダクトターム方式、またはルックアップ・テーブル方式で構成されています。
本書では@<b>{ルックアップ・テーブル}(Lookup Table, @<b>{LUT})方式のFPGAを利用します。

//table[lut_sample_truth][真理値表の例]{
X	Y	A
==============================
0	0	0
0	1	1
1	0	1
1	1	0
//}

//image[lut][@<table>{lut_sample_truth}を実現するLUT][width=40%]

LUTとは、真理値表を記憶素子に保存しておいて、
入力によって記憶された真理値を選択して出力する回路のことです。
例えば、2つの入力@<code>{X}と@<code>{Y}を受け取って@<code>{A}を出力する論理回路(@<table>{lut_sample_truth})は、
@<img>{lut}の回路で実現することができます。
ここでマルチプレクサ(multiplexer, MUX)とは、複数の入力を選択信号によって選択して出力する回路のことです。

@<img>{lut}では、記憶素子のデータを@<code>{Y}によって選択し、さらに@<code>{X}によって選択することで2入力1出力の真理値表の論理回路を実現しています。
入力がN個で出力がM個のLUTのことをN入力M出力LUTと呼びます。

ルックアップ・テーブル方式のFPGAは、多数のLUT、入出力装置、これらを相互接続するための配線によって構成されています。
また、乗算回路やメモリなどの部品はFPGAよりも専用の回路で実現した方が良い@<fn>{memory.fpga}ので、
メモリや乗算回路の部品が内蔵されていることがあります。

//footnote[memory.fpga][例えばメモリは同じパターンの論理回路の繰り返しで大きな面積を要します。メモリはよく利用される回路であるため、専用の回路を用意した方が空間的な効率が改善される上に、遅延が少なくなるという利点があります]

本書では2つのFPGA(Tang Nano 9K、PYNQ-Z1)を使用して実機でCPUを動作させます。
2024年11月12日時点ではどちらも秋月電子通商で入手することができて、
Tang Nano 9KはAliExpressで3000円くらい、
PYNQ-Z1は秋月電子通商で50000円くらいで入手できます。

== LEDの制御

//image[tangmega138k_led][Tang Mega 138K ProのLED(6個)][width=100%]

大抵のFPGAボードにはLEDがついています。
本章では2つのテストプログラム(LEDを点灯させる、LEDを点滅させる)によって、CPUの動作確認を行います。

LEDはトップモジュールのポートを経由して制御します(@<img>{ledreg_to_led})。
ポートとLEDの接続方法は合成系によって異なるため、それらの接続方法は後で考えます。
CPUからLEDを制御するには、メモリ経由で制御する、CSRによって制御するなどの方法が考えられます。
本書ではLEDを制御するためのCSRを実装して、CSRをトップモジュールのポートに接続することでLEDを制御します。

//image[ledreg_to_led][CSRのLED制御用レジスタがLEDに接続される][width=70%]

=== CSRにLED制御用レジスタを実装する

RISC-VのCSRのアドレス空間には、読み込みと書き込みができるCSRを自由に定義できる場所(@<code>{0x800}から@<code>{0x8FF})が用意されています@<fn>{riscv.isa.csr_addr}。
これの先頭アドレス@<code>{0x800}をLEDの制御用レジスタのアドレスとして実装を進めます。

//footnote[riscv.isa.csr_addr][The RISC-V Instruction Set Manual Volume II: Privileged Architecture version 20240411 Table 3. Allocation of RISC-V CSR address ranges.]

まず、CsrAddr型にLED制御用レジスタのアドレスを追加します(@<list>{csrunit.veryl.ledcsr-range.addr})。

//list[csrunit.veryl.ledcsr-range.addr][LEDの制御用レジスタのアドレスを追加する (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/csrunit.veryl,addr)
    enum CsrAddr: logic<12> {
        MTVEC = 12'h305,
        MEPC = 12'h341,
        MCAUSE = 12'h342,
        @<b>|LED = 12'h800,|
    }
#@end
//}

書き込みマスクはすべて書き込み可にします(@<list>{csrunit.veryl.ledcsr-range.wmask})。

//list[csrunit.veryl.ledcsr-range.wmask][LEDの制御用レジスタの書き込みマスク (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/csrunit.veryl,wmask)
    const LED_WMASK   : UIntX = 'hffff_ffff_ffff_ffff;
#@end
//}

LEDの制御用レジスタをcsrunitモジュールのポートに定義します。CSRの幅はUIntXです(@<list>{csrunit.veryl.ledcsr-range.port})。

//list[csrunit.veryl.ledcsr-range.port][LEDの制御用レジスタを定義する (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/csrunit.veryl,port)
module csrunit (
    ...
    rdata      : output UIntX       ,
    raise_trap : output logic       ,
    trap_vector: output Addr        ,
    @<b>|led        : output UIntX       ,|
) {
#@end
//}

@<code>{rdata}と@<code>{wmask}にLEDの制御用レジスタの値を割り当てます(@<list>{csrunit.veryl.ledcsr-range.rdata_wmask})。

//list[csrunit.veryl.ledcsr-range.rdata_wmask][rdataとwmaskに値を割り当てる (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/csrunit.veryl,rdata_wmask)
    // read
    rdata = case csr_addr {
        CsrAddr::MTVEC : mtvec,
        CsrAddr::MEPC  : mepc,
        CsrAddr::MCAUSE: mcause,
        @<b>|CsrAddr::LED   : led,|
        default        : 'x,
    };
    // write
    wmask = case csr_addr {
        CsrAddr::MTVEC : MTVEC_WMASK,
        CsrAddr::MEPC  : MEPC_WMASK,
        CsrAddr::MCAUSE: MCAUSE_WMASK,
        @<b>|CsrAddr::LED   : LED_WMASK,|
        default        : 0,
    };
#@end
//}

リセット時にLEDの制御用レジスタの値を0に設定します(@<list>{csrunit.veryl.ledcsr-range.reset})。

//list[csrunit.veryl.ledcsr-range.reset][リセット値の設定 (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/csrunit.veryl,reset)
    if_reset {
        mtvec  = 0;
        mepc   = 0;
        mcause = 0;
        @<b>|led    = 0;|
    } else {
#@end
//}

LEDの制御用レジスタへの書き込み処理を実装します(@<list>{csrunit.veryl.ledcsr-range.write})。

//list[csrunit.veryl.ledcsr-range.write][LEDの制御用レジスタへの書き込み (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/csrunit.veryl,write)
    case csr_addr {
        CsrAddr::MTVEC : mtvec  = wdata;
        CsrAddr::MEPC  : mepc   = wdata;
        CsrAddr::MCAUSE: mcause = wdata;
        @<b>|CsrAddr::LED   : led    = wdata;|
        default        : {}
    }
#@end
//}

=== トップモジュールにLEDを制御するポートを実装する

LEDはトップモジュールのポートを経由して制御します(@<img>{ledreg_to_led})。
そのため、トップモジュールにLEDを制御するポートを作成して、csrunitのLEDの制御用レジスタの値を接続します
(@<list>{core.veryl.ledcsr-range.port}、@<list>{core.veryl.ledcsr-range.inst}、@<list>{top.veryl.ledcsr-range.port}、@<list>{top.veryl.ledcsr-range.inst})。
LEDの個数はFPGAによって異なるため、とりあえずXLEN(=64)ビットのポートを定義します。

//list[core.veryl.ledcsr-range.port][coreモジュールにポートを追加する (core.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/core.veryl,port)
module core (
    clk     : input   clock                                    ,
    rst     : input   reset                                    ,
    i_membus: modport membus_if::<ILEN, XLEN>::master          ,
    d_membus: modport membus_if::<MEM_DATA_WIDTH, XLEN>::master,
    @<b>|led     : output  UIntX                                    ,|
#@end
//}

//list[core.veryl.ledcsr-range.inst][csrunitモジュールのledポートと接続する (core.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/core.veryl,inst)
    inst csru: csrunit (
        ...
        rdata      : csru_rdata      ,
        raise_trap : csru_raise_trap ,
        trap_vector: csru_trap_vector,
        @<b>|led                          ,|
    );
#@end
//}

//list[top.veryl.ledcsr-range.port][topモジュールにポートを追加する (top.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/top.veryl,port)
module top #(
    param MEMORY_FILEPATH_IS_ENV: bit    = 1                 ,
    param MEMORY_FILEPATH       : string = "MEMORY_FILE_PATH",
) (
    clk: input  clock,
    rst: input  reset,
    @<b>|led: output UIntX,|
    #[ifdef(TEST_MODE)]
    test_success: output bit,
) {
#@end
//}

//list[top.veryl.ledcsr-range.inst][coreモジュールのledポートと接続する (top.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/top.veryl,inst)
    inst c: core (
        clk       ,
        rst       ,
        i_membus  ,
        d_membus  ,
        @<b>|led       ,|
    );
#@end
//}

CSRの読み書きによってLED制御用のポートを制御することができるようになりました。

=== テストを作成する

==== LEDを点灯させるプログラム

LEDを点灯させるプログラムを作成します(@<list>{led.asm.led-test}、@<list>{led.hex.led-test})。
CSRRWI命令で@<code>{0x800}に12(@<code>{'b01100})を書き込みます。

//list[led.asm.led-test][LEDを点灯させるプログラム (test/led.asm)]{
#@mapfile(scripts/05b/led-test/core/test/led.asm)
80065073 //  0: csrrwi x0, 0x800, 12
00000067 //  4: jal x0, 0
#@end
//}

//list[led.hex.led-test][LEDを点灯させるプログラム (test/led.hex)]{
#@mapfile(scripts/05b/led-test/core/test/led.hex)
0000006780065073
#@end
//}


==== LEDを点滅させるプログラム

LEDを点滅させるプログラムを作成します(@<list>{led_counter.asm.led-test}、@<list>{led_counter.hex.led-test})。
これはちょっと複雑です。

//list[led_counter.asm.led-test][LEDを点滅させるプログラム (test/led_counter.asm)]{
#@mapfile(scripts/05b/led-test/core/test/led_counter.asm)
000f40b7 //  0: lui x1, 244
24008093 //  4: addi x1, x1, 576
00000113 //  8: addi x2, x0, 0
00110113 //  c: addi x2, x2, 1
fe209ee3 // 10: bne x1, x2, -4
800031f3 // 14: csrrc x3, 0x800, x0
00118193 // 18: addi x3, x3, 1
80019073 // 1c: csrrw x0, 0x800, x3
00000067 // 20: jalr x0, 0(x0)
00000067 // 24: jalr x0, 0(x0)
#@end
//}

//list[led_counter.hex.led-test][LEDを点滅させるプログラム (test/led_counter.hex)]{
#@mapfile(scripts/05b/led-test/core/test/led_counter.hex)
24008093000f40b7
0011011300000113
800031f3fe209ee3
8001907300118193
0000006700000067
#@end
//}

@<list>{led_counter.asm.led-test}は次のように動作します。

 1. x1に1000000(@<code>{(244 << 12) + 576})を代入する
 2. x2に0を代入
 3. x2がx1と一致するまでx2に1を足し続ける
 4. LEDのCSRをx3に読み取り、1を足した値を書き込む
 5. 1 ~ 4を繰り返す

これにより、LEDの制御用レジスタは一定の時間ごとに@<code>{0}→@<code>{1}→@<code>{2}と値が変わっていきます。

== FPGAへの合成① (Tang Nano 9K)

Tang Nano 9KをターゲットにCPUを合成します。
使用するEDAのバージョンは次の通りです。

 * GOWIN FPGA Designer V1.9.10.03
 * Gowin Programmer Version 1.9.9

=== 合成用のモジュールを作成する

//image[tangnano9k_led][Tang Nano 9KのLED][width=70%]

Tang Nano 9KにはLEDが6個実装されています(@<img>{tangnano9k_led})。
そのため、LEDの制御には6ビット必要です。
それに対して、topモジュールの@<code>{led}ポートは64ビットであるため、ビット幅が一致しません。

Tang Nano 9Kのためだけにtopモジュールの@<code>{led}ポートのビット幅を変更すると柔軟性がなくなってしまうため、
topモジュールの上位に合成用のモジュールを作成して調整します。

@<code>{src/top_tang.veryl}を作成し、次のように記述します(@<list>{top_tang.veryl.tangnano9k})。
top_tangモジュールの@<code>{led}ポートは6ビットとして定義して、topモジュールの@<code>{led}ポートの下位6ビットを接続しています。

//list[top_tang.veryl.tangnano9k][Tang Nano 9K用の最上位モジュール (top_tang.veryl)]{
#@mapfile(scripts/05b/tangnano9k/core/src/top_tang.veryl)
import eei::*;

module top_tang (
    clk: input  clock   ,
    rst: input     reset   ,
    led: output    logic<6>,
) {
    // CSRの下位ビットをLEDに接続する
    var led_top: UIntX;
    always_comb {
        led = led_top[5:0];
    }

    inst t: top #(
        MEMORY_FILEPATH_IS_ENV: 0,
        MEMORY_FILEPATH       : "",
    ) (
        clk,
        rst         ,
        led: led_top,
        #[ifdef(TEST_MODE)]
        test_success: _,
    );
}
#@end
//}

=== プロジェクトを作成する

新規プロジェクトを作成します。
GOWIN FPGA Designerを開いて、Quick StartのNew Project...を選択します。
選択したら表示されるウィンドウでは、FPGA Design Projectを選択してOKを押してください(@<img>{gowin_new_project})。

//image[gowin_new_project][FPGA Design Projectを選択する]

プロジェクト名と場所を指定します。
プロジェクト名はtangnano9k、場所は好きな場所に指定してください(@<img>{gowin_project_name})。

//image[gowin_project_name][プロジェクト名と場所の指定]

ターゲットのFPGAを選択します。
@<code>{GW1NR-LV9QN88PC6/I5}を選択して、Nextを押してください(@<img>{gowin_select_device})。

//image[gowin_select_device][ターゲットを選択する]

プロジェクトが作成されました(@<img>{gowin_created_project})。

//image[gowin_created_project][プロジェクトが作成された]

=== 設定を変更する

プロジェクトのデフォルト設定ではSystemVerilogを利用できないため、設定を変更します。

ProjectのConfigurationから、設定画面を開きます(@<img>{gowin_open_configuration})。

//image[gowin_open_configuration][設定画面を開く]

SynthesizeのVerilog Languageを@<code>{System Verilog 2017}に設定します。
同じ画面でトップモジュール(Top Module/Entity)を設定できるため、@<code>{core_top_tang}を指定します(@<img>{gowin_configuration})。

//image[gowin_configuration][設定を変更する]

=== ファイルをインポートする

Verylのソースファイルをビルドして生成されるファイルリスト(@<code>{core.f})を利用して、
生成されたSystemVerilogソースファイルをインポートします。

ウィンドウの下部にあるConsole画面で、次のコマンドを実行します(@<list>{import_files.command}、@<img>{gowin_import_files})。
VerylをWSLで実行してGOWIN FPGA DesignerをWindowsで開いている場合、ファイルリスト内のパスをWindowsから参照できるパスに変更する必要があります。

//list[import_files.command][SystemVerilogファイルをインポートするコマンド]{
import_files -force -fileList ファイルリストへのパス
//}

//image[gowin_import_files][コマンドを実行する]

ソースファイルをインポートできました(@<img>{gowin_imported_files})。
@<code>{import_files}コマンドはプロジェクトフォルダにコピーするコマンドであるため、
Verylのソースファイルが更新されたら再度コマンドを実行してインポートする必要があります。

//image[gowin_imported_files][インポートに成功した]

=== 制約ファイルを作成する

==== 物理制約

top_tangモジュールのclk、rst、ledポートを、
それぞれTang Nano 9Kの水晶発振器、ボタン、LEDに接続します。
接続の設定には物理制約ファイルを作成します。

新しくファイルを作成するので、プロジェクトを左クリックしてNew Fileを選択します(@<img>{gowin_new_file})。

//image[gowin_new_file][New Fileを選択する]

物理制約ファイルを選択します(@<img>{gowin_select_cst})。

//image[gowin_select_cst][物理制約ファイルを選択する]

名前は@<code>{tangnano9k.cst}にします(@<img>{gowin_new_cst_file})。

//image[gowin_new_cst_file][名前を設定する]

物理制約ファイルには、次のように記述します(@<list>{tangnano9k.cst.tangnano9k})。

//list[tangnano9k.cst.tangnano9k][物理制約ファイル (tangnano9k.cst)]{
#@mapfile(scripts/05b/tangnano9k/synth/tangnano9k/tangnano9k.cst)
// Clock and Reset
IO_LOC "clk" 52;
IO_PORT "clk" IO_TYPE=LVCMOS33 PULL_MODE=UP;
IO_LOC "rst" 4;
IO_PORT "rst" PULL_MODE=UP;

// LED
IO_LOC "led[5]" 16;
IO_LOC "led[4]" 15;
IO_LOC "led[3]" 14;
IO_LOC "led[2]" 13;
IO_LOC "led[1]" 11;
IO_LOC "led[0]" 10;

IO_PORT "led[5]" PULL_MODE=UP DRIVE=8;
IO_PORT "led[4]" PULL_MODE=UP DRIVE=8;
IO_PORT "led[3]" PULL_MODE=UP DRIVE=8;
IO_PORT "led[2]" PULL_MODE=UP DRIVE=8;
IO_PORT "led[1]" PULL_MODE=UP DRIVE=8;
IO_PORT "led[0]" PULL_MODE=UP DRIVE=8;
#@end
//}

@<code>{IO_LOC}で接続する場所の名前を指定します。

場所の名前はTang Nano 9Kのデータシートで確認できます。
例えば@<img>{tangnano9k_datasheet_led}と@<img>{tangnano9k_datasheet_ledpos}から、
LEDは@<code>{10}、@<code>{11}、@<code>{13}、@<code>{14}、@<code>{15}、@<code>{16}に割り当てられていることが分かります。
また、LEDが負論理(@<code>{1}で消灯、@<code>{0}で点灯)であることが分かります。
水晶発信器とボタンについても、データシートを見て確認してください。

//image[tangnano9k_datasheet_led][LED]
//image[tangnano9k_datasheet_ledpos][PIN10_IOL～の接続先]

==== タイミング制約

FPGAが何MHzで動くかをタイミング制約ファイルに記述します。

物理制約ファイルと同じようにAdd Fileを選択して、
タイミング制約ファイルを作成します(@<img>{gowin_select_timing})。

//image[gowin_select_timing][タイミング制約ファイルを選択する]

名前は@<code>{timing.sdc}にします(@<img>{gowin_new_timing_file})。

//image[gowin_new_timing_file][名前を設定する]

タイミング制約ファイルには、次のように記述します(@<list>{timing.sdc.tangnano9k})。

//list[timing.sdc.tangnano9k][タイミング制約ファイル (timing.sdc)]{
#@mapfile(scripts/05b/tangnano9k/synth/tangnano9k/timing.sdc)
create_clock -name clk -period 37.037 -waveform {0 18.518} [get_ports {clk}]
#@end
//}

Tang Nano 9Kの水晶発振器は27MHzで振動します。
そのため、@<code>{create_clock}で@<code>{clk}ポートの周期を@<code>{37.037}ナノ秒(27MHz)に設定しています。

=== LEDの点灯を確認する

まず、LEDの点灯を確認します。

インポートされた@<code>{top_tang.sv}のtopモジュールをインスタンス化している場所で、
@<code>{MEMORY_FILEPATH}パラメータの値を@<code>{test/led.hex}のパスに設定します(@<list>{led.hex.set})。

#@# TODO mapにする
//list[led.hex.set][読み込むファイルを設定する (top_tang.sv)]{
core_top #(
    .MEMORY_FILEPATH_IS_ENV (0 ),
    .MEMORY_FILEPATH        ("test/led.hexへのパス")
) t (
//}

ProcessタブのSynthesizeをクリックし、合成します(@<img>{gowin_process_tab})。
//image[gowin_process_tab][Processタブ]

そうすると、合成に失敗して@<img>{gowin_ram_error}のようなエラーが表示されます。

//image[gowin_ram_error][合成するとエラーが発生する]

これは、Tang Nano 9Kに搭載されているメモリ用の部品の数が足りないために発生しているエラーです。
この問題を回避するために、eeiパッケージの@<code>{MEM_ADDR_WIDTH}の値を@<code>{10}に変更します。
@<code>{eei.sv}を変更する場合は、ファイルリストをインポートする度に変更するようにしてください。
@<code>{eei.veryl}を変更する場合は、ファイルリストをインポートしなおしてください。

メモリ幅を変更したら、もう一度合成します。

//image[gowin_synth_success][合成と配置配線に成功した]

合成に成功したら、@<code>{Place & Route}を押して、論理回路の配置配線情報を生成します(@<img>{gowin_synth_success})。
それが終了したら、Tang Nano 9KをPCに接続して、Gowin Programmerを開いて設計をFPGAに書き込みます(@<img>{gowin_programmer})。

//image[gowin_programmer][Program / Configureボタンを押して書き込む]

Tang Nano 9Kの中央2つ以外のLEDが点灯していることを確認できます。

//image[tangnano9k_test_led][LEDの制御用レジスタの値が12(@<code>{64'b1100})なので中央2つのLEDが点灯せず、それ以外が点灯する][width=70%]

=== LEDの点滅を確認する

@<code>{MEMORY_FILEPATH}パラメータの値を@<code>{test/led_counter.hex}のパスに設定します(@<list>{led_counter.hex.set})。

#@# TODO
//list[led_counter.hex.set][読み込むファイルを変更する (top_tang.sv)]{
core_top #(
    .MEMORY_FILEPATH_IS_ENV (0 ),
    .MEMORY_FILEPATH        ("test/led_counter.hexへのパス")
) t (
//}

合成、配置配線しなおして、設計をFPGAに書き込むとLEDが点灯します@<fn>{tangnano9k.led_counter}。

//raw[|html|<iframe width="100%" max-width="640" style="aspect-ratio: 16 / 9;" src="https://www.youtube.com/embed/OpXiXha-ZnI" title="tangnano9k test ledcounter" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>]

//footnote[tangnano9k.led_counter][@<href>{https://youtu.be/OpXiXha-ZnI}]

== FPGAへの合成② (PYNQ-Z1)

合成、配置配線しなおして、設計をFPGAに書き込むとLEDが点灯します@<fn>{pynq_z1.led_counter}。

//raw[|html|<iframe width="100%" max-width="640" style="aspect-ratio: 16 / 9;" src="https://www.youtube.com/embed/byCr_464dW4" title="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>]

//footnote[pynq_z1.led_counter][@<href>{https://youtu.be/byCr_464dW4}]
