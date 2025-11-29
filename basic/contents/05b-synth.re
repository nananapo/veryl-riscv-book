= CPUの合成

//abstract{
//}

これまでの章では、RV64IのCPUを作成してパイプライン化しました。
今までは動作確認とテストはシミュレータで行っていましたが、
本章では実機(FPGA)でCPUを動かします。

//image[pynq_z1][PYNQ-Z1][width=30%]

== FPGAとは何か？

集積回路を製造するには手間と時間とお金が必要です。
FPGAを使うと、少しの手間と少しの時間、安価に集積回路の実現をお試しできます。

@<b>{FPGA}(Field Programmable Gate Array)は、
任意の論理回路を実現できる集積回路のことです。
ハードウェア記述言語で設計した論理回路をFPGA上に設定することで、
実際に集積回路を製造しなくても実機で論理回路を再現できます。

「任意の論理回路を実現できる集積回路」は、
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
例えば、2つの入力@<code>{X}と@<code>{Y}を受け取って@<code>{A}を出力する論理回路(@<table>{lut_sample_truth})は、@<img>{lut}の回路で実現できます。
ここでマルチプレクサ(multiplexer, MUX)とは、複数の入力を選択信号によって選択して出力する回路のことです。

@<img>{lut}では、記憶素子のデータを@<code>{Y}によって選択し、さらに@<code>{X}によって選択することで2入力1出力の真理値表の論理回路を実現しています。
入力がN個で出力がM個のLUTのことをN入力M出力LUTと呼びます。

ルックアップ・テーブル方式のFPGAは、多数のLUT、入出力装置、これらを相互接続するための配線によって構成されています。
また、乗算回路やメモリなどの部品はFPGAよりも専用の回路で実現した方が良い@<fn>{memory.fpga}ので、
メモリや乗算回路の部品が内蔵されていることがあります。

//footnote[memory.fpga][例えばメモリは同じパターンの論理回路の繰り返しで大きな面積を要します。メモリはよく利用される回路であるため、専用の回路を用意した方が空間的な効率が改善される上に、遅延が少なくなるという利点があります]

本書では2つのFPGA(Tang Nano 9K、PYNQ-Z1)を使用して実機でCPUを動作させます。
2024年11月12日時点ではどちらも秋月電子通商で入手できて、
Tang Nano 9Kは3000円くらい、
PYNQ-Z1は50000円くらいで入手できます。

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

まず、@<code>{CsrAddr}型にLED制御用レジスタのアドレスを追加します(@<list>{csrunit.veryl.ledcsr-range.addr})。

//list[csrunit.veryl.ledcsr-range.addr][LEDの制御用レジスタのアドレスを追加する (csrunit.veryl)]{
#@maprange(scripts/05b/ledcsr-range/core/src/eei.veryl,addr)
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
    clk        : input  clock       ,
    rst        : input  reset       ,
    valid      : input  logic       ,
    pc         : input  Addr        ,
    ctrl       : input  InstCtrl    ,
    rd_addr    : input  logic   <5> ,
    csr_addr   : input  logic   <12>,
    rs1        : input  UIntX       ,
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
        clk                            ,
        rst                            ,
        valid   : mems_valid           ,
        pc      : mems_pc              ,
        ctrl    : mems_ctrl            ,
        rd_addr : mems_rd_addr         ,
        csr_addr: mems_inst_bits[31:20],
        rs1     : if mems_ctrl.funct3[2] == 1 && mems_ctrl.funct3[1:0] != 0 ?
            {1'b0 repeat XLEN - $bits(memq_rdata.rs1_addr), memq_rdata.rs1_addr} // rs1を0で拡張する
        :
            memq_rdata.rs1_data
        ,
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
    #[ifdef(TEST_MODE)]
    test_success: output bit,

    clk: input  clock,
    rst: input  reset,
    @<b>|led: output UIntX,|
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

CSRの読み書きによってLED制御用のポートを制御できるようになりました。

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

==={tangnano9k.create_top} 合成用のモジュールを作成する

//image[tangnano9k_led][Tang Nano 9KのLED(6個)][width=70%]

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
    rst: input  reset   ,
    led: output logic<6>,
) {
    // CSRの下位ビットをLEDに接続する
    var led_top: UIntX;
    always_comb {
        led = led_top[5:0];
    }

    inst t: top #(
        MEMORY_FILEPATH_IS_ENV: 0 ,
        MEMORY_FILEPATH       : "",
    ) (
        #[ifdef(TEST_MODE)]
        test_success: _,

        clk         ,
        rst         ,
        led: led_top,
    );
}
#@end
//}

==={tangnano9k.create_project} プロジェクトを作成する

新規プロジェクトを作成します。
GOWIN FPGA Designerを開いて、Quick Startの@<code>{New Project...}を選択します。
選択したら表示されるウィンドウでは、FPGA Design Projectを選択してOKを押してください(@<img>{gowin/new_project})。

//image[gowin/new_project][FPGA Design Projectを選択する]

プロジェクト名と場所を指定します。
プロジェクト名はtangnano9k、場所は好きな場所に指定してください(@<img>{gowin/project_name})。

//image[gowin/project_name][プロジェクト名と場所の指定]

ターゲットのFPGAを選択します。
@<code>{GW1NR-LV9QN88PC6/I5}を選択して、Nextを押してください(@<img>{gowin/select_device})。

//image[gowin/select_device][ターゲットを選択する]

プロジェクトが作成されました(@<img>{gowin/created_project})。

//image[gowin/created_project][プロジェクトが作成された]

==={tangnano9k.change_setting} 設定を変更する

プロジェクトのデフォルト設定ではSystemVerilogを利用できないため、設定を変更します。

ProjectのConfigurationから、設定画面を開きます(@<img>{gowin/open_configuration})。

//image[gowin/open_configuration][設定画面を開く]

SynthesizeのVerilog Languageを@<code>{System Verilog 2017}に設定します。
同じ画面でトップモジュール(Top Module/Entity)を設定できるため、@<code>{core_top_tang}を指定します(@<img>{gowin/configuration})。

//image[gowin/configuration][設定を変更する]

==={tangnano9k.import} 設計ファイルを追加する

Verylのソースファイルをビルドして、
生成されるファイルリスト(@<code>{core.f})を利用して、
生成されたSystemVerilogソースファイルをプロジェクトに追加します。

Gowin FPGA Programmerでファイルを追加するには、
ウィンドウ下部のConsole画面で@<code>{add_file}を実行します。
しかし、@<code>{add_file}はファイルリストの読み込みに対応していないので、
ファイルリストを読み込んで@<code>{add_file}を実行するスクリプトを作成します(@<list>{add_file.tcl.tangnano9k})。

//list[add_file.tcl.tangnano9k][add_files.tcl]{
#@mapfile(scripts/05b/tangnano9k/synth/tangnano9k/add_files.tcl)
set file_list [open "ファイルリストのパス" r]
while {[gets $file_list line] != -1} {
    # skip blank or comment line
    if {[string trim $line] eq "" || [string index $line 0] eq "#"} {
        continue
    }
    # add file to project
    add_file $line
}
close $file_list
#@end
//}

ウィンドウの下部にあるConsole画面で、次のコマンドを実行します(@<list>{gowin.add_files.command}、@<img>{gowin/source_add_files})。
VerylをWSLで実行してGOWIN FPGA DesignerをWindowsで開いている場合、ファイルリスト内のパスをWindowsから参照できるパスに変更する必要があります。

//list[gowin.add_files.command][Tclスクリプトを実行する]{
source add_files.tclのパス
//}

//image[gowin/source_add_files][コマンドを実行する]

ソースファイルを追加できました(@<img>{gowin/added_files})。

//image[gowin/added_files][ソースファイルの追加に成功した]

==={tangnano9k.create_constraint} 制約ファイルを作成する

===={tangnano9k.cst} 物理制約

top_tangモジュールのclk、rst、ledポートを、
それぞれTang Nano 9Kの水晶発振器、ボタン、LEDに接続します。
接続の設定には物理制約ファイルを作成します。

新しくファイルを作成するので、プロジェクトを左クリックしてNew Fileを選択します(@<img>{gowin/new_file})。

//image[gowin/new_file][New Fileを選択する]

物理制約ファイルを選択します(@<img>{gowin/select_cst})。

//image[gowin/select_cst][物理制約ファイルを選択する]

名前は@<code>{tangnano9k.cst}にします(@<img>{gowin/new_cst_file})。

//image[gowin/new_cst_file][名前を設定する]

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

===={tangnano9k.sdc} タイミング制約

FPGAが何MHzで動くかをタイミング制約ファイルに記述します。

物理制約ファイルと同じようにAdd Fileを選択して、
タイミング制約ファイルを作成します(@<img>{gowin/select_timing})。

//image[gowin/select_timing][タイミング制約ファイルを選択する]

名前は@<code>{timing.sdc}にします(@<img>{gowin/new_timing_file})。

//image[gowin/new_timing_file][名前を設定する]

タイミング制約ファイルには、次のように記述します(@<list>{timing.sdc.tangnano9k})。

//list[timing.sdc.tangnano9k][タイミング制約ファイル (timing.sdc)]{
#@mapfile(scripts/05b/tangnano9k/synth/tangnano9k/timing.sdc)
create_clock -name clk -period 37.037 -waveform {0 18.518} [get_ports {clk}]
#@end
//}

Tang Nano 9Kの水晶発振器は27MHzで振動します。
そのため、@<code>{create_clock}で@<code>{clk}ポートの周期を@<code>{37.037}ナノ秒(27MHz)に設定しています。

==={tangnano9k.test} テスト

===={tangnano9k.test.led} LEDの点灯を確認する

まず、LEDの点灯を確認します。

インポートされた@<code>{top_tang.sv}のtopモジュールをインスタンス化している場所で、
@<code>{MEMORY_FILEPATH}パラメータの値を@<code>{test/led.hex}のパスに設定します(@<list>{led.hex.set})。

#@# TODO mapに戻す　できれば
//list[led.hex.set][読み込むファイルを設定する (top_tang.sv)]{
core_top #(
    .MEMORY_FILEPATH_IS_ENV (0 ),
    .MEMORY_FILEPATH        ("test/led.hexへのパス")
) t (
//}

ProcessタブのSynthesizeをクリックし、合成します(@<img>{gowin/process_tab})。
//image[gowin/process_tab][Processタブ]

そうすると、合成に失敗して@<img>{gowin/ram_error}のようなエラーが表示されます。

//image[gowin/ram_error][合成するとエラーが発生する]

これは、Tang Nano 9Kに搭載されているメモリ用の部品の数が足りないために発生しているエラーです。
この問題を回避するために、eeiパッケージの@<code>{MEM_ADDR_WIDTH}の値を@<code>{10}に変更します@<fn>{mem_10}。
メモリの幅を変更したら、Verylファイルをビルドしなおして、もう一度合成します。

//footnote[mem_10][適当な値です]

//image[gowin/synth_success][合成と配置配線に成功した]

合成に成功したら、@<code>{Place & Route}を押して、論理回路の配置配線情報を生成します(@<img>{gowin/synth_success})。
それが終了したら、Tang Nano 9KをPCに接続して、Gowin Programmerを開いて設計をFPGAに書き込みます(@<img>{gowin/programmer})。

//image[gowin/programmer][Program / Configureボタンを押して書き込む]

Tang Nano 9Kの中央2つ以外のLEDが点灯していることを確認できます。
@<img>{tangnano9k_led}の左下のボタンを押すと全てのLEDが点灯します。

//image[tangnano9k_test_led][LEDの制御用レジスタの値が12(@<code>{64'b1100})なので中央2つのLEDが点灯せず、それ以外が点灯する][width=70%]

===={tangnano9k.test.blink} LEDの点滅を確認する

@<code>{MEMORY_FILEPATH}パラメータの値を@<code>{test/led_counter.hex}のパスに設定します(@<list>{led_counter.hex.set})。

#@# TODO mapに戻す　できれば
//list[led_counter.hex.set][読み込むファイルを変更する (top_tang.sv)]{
core_top #(
    .MEMORY_FILEPATH_IS_ENV (0 ),
    .MEMORY_FILEPATH        ("test/led_counter.hexへのパス")
) t (
//}

合成、配置配線しなおして、設計をFPGAに書き込むとLEDが点滅します@<fn>{tangnano9k.led_counter}。
@<img>{tangnano9k_led}の左下のボタンを押すと状態がリセットされます。

//raw[|html|<iframe width="100%" max-width="640" style="aspect-ratio: 16 / 9;" src="https://www.youtube.com/embed/OpXiXha-ZnI" title="tangnano9k test ledcounter" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>]

//footnote[tangnano9k.led_counter][@<href>{https://youtu.be/OpXiXha-ZnI}]

== FPGAへの合成② (PYNQ-Z1)

PYNQ-Z1をターゲットにCPUを合成します。
使用するEDAのバージョンは次の通りです。

 * Vivado v2023.2

初めてPYNQ-Z1を使う人は、@<href>{https://www.pynq.io/boards.html, PYNQのドキュメント}やACRiの記事を参考に起動方法を確認して、Vivadoにボードファイルを追加してください。

==={pynq_z1.create_top} 合成用のモジュールを作成する

//image[pynq_z1_led][PYNQ-Z1のLED(6個)][width=70%]

PYNQ-Z1にはLEDが6個実装されています(@<img>{pynq_z1_led})。
本章ではボタンの上の横並びの4つのLED(@<img>{pynq_z1_led}右下)を使用します。

@<secref>{tangnano9k.create_top}とおなじように、
@<code>{led}ポートのビット幅を一致させるためにPYNQ-Z1の合成のためのトップモジュールを作成します。

@<code>{src/top_pynq_z1.veryl}を作成し、次のように記述します(@<list>{top_pynq_z1.veryl.pynq_z1})。
top_pynq_z1モジュールの@<code>{led}ポートは4ビットとして定義して、topモジュールの@<code>{led}ポートの下位4ビットを接続しています。

//list[top_pynq_z1.veryl.pynq_z1][PYNQ-Z1用の最上位モジュール (top_pynq_z1.veryl)]{
#@mapfile(scripts/05b/pynq_z1/core/src/top_pynq_z1.veryl)
import eei::*;

module top_pynq_z1 #(
    param MEMORY_FILEPATH: string = "",
) (
    clk: input  clock   ,
    rst: input  reset   ,
    led: output logic<4>,
) {

    // CSRの下位ビットをLEDに接続する
    var led_top: UIntX;
    always_comb {
        led = led_top[3:0];
    }

    inst t: top #(
        MEMORY_FILEPATH_IS_ENV: 0              ,
        MEMORY_FILEPATH       : MEMORY_FILEPATH,
    ) (
        #[ifdef(TEST_MODE)]
        test_success: _,

        clk         ,
        rst         ,
        led: led_top,
    );
}
#@end
//}

==={pynq_z1.create_project} プロジェクトを作成する

Vivadoを開いて、プロジェクトを作成します。
Quick StartのCreate Projectを押すと、@<img>{xilinx/pj/0}が出るのでNextを押します。

//image[xilinx/pj/0][Nextを押す]

プロジェクト名とフォルダを入力します(@<img>{xilinx/pj/1})。
好きな名前と場所を入力したらNextを押します。

//image[xilinx/pj/1][プロジェクト名とフォルダを入力する]

プロジェクトの形式を設定します(@<img>{xilinx/pj/2})。
RTL Projectを選択して、@<code>{Do not specify sources at this time}にチェックを入れてNextを押します。

//image[xilinx/pj/2][プロジェクトの形式を選択する]

ターゲットのFPGAボードを選択します(@<img>{xilinx/pj/3})。
今回はPYNQ-Z1がターゲットなので、Boardsタブに移動してPYNQ-Z1を選択します。
PYNQ-Z1が表示されない場合、ボードファイルをVivadoに追加してください。

//image[xilinx/pj/3][PYNQ-Z1を選択する]

概要を確認して、Nextを押します(@<img>{xilinx/pj/4})。

//image[xilinx/pj/4][Nextを押す]

プロジェクトが作成されました(@<img>{xilinx/pj/5})。

//image[xilinx/pj/5][プロジェクトの画面]

==={pynq_z1.import} 設計ファイルを追加する

Verylのソースファイルをビルドして、
生成されるファイルリスト(@<code>{core.f})を利用して、
生成されたSystemVerilogソースファイルをプロジェクトに追加します。

Vivadoでファイルを追加するには、
ウィンドウ下部のTcl Console画面で@<code>{add_file}を実行します。
しかし、@<code>{add_file}はファイルリストの読み込みに対応していないので、
ファイルリストを読み込んで@<code>{add_file}を実行するスクリプトを作成します(@<list>{add_files.tcl.pynq_z1})。

//list[add_files.tcl.pynq_z1][add_files.tcl]{
#@mapfile(scripts/05b/pynq_z1/synth/pynq_z1/add_files.tcl)
set file_list [open "ファイルリストのパス" r]
while {[gets $file_list line] != -1} {
    # skip blank or comment line
    if {[string trim $line] eq "" || [string index $line 0] eq "#"} {
        continue
    }
    # add file to project
    add_files -force -norecurse $line
}
close $file_list
#@end
//}

ウィンドウの下部にあるTcl Console画面で、次のコマンドを実行します(@<list>{vivado.add_files.command}、@<img>{xilinx/add/0})。
VerylをWSLで実行してVivadoをWindowsで開いている場合、ファイルリスト内のパスをWindowsから参照できるパスに変更する必要があります。

//list[vivado.add_files.command][Tclスクリプトを実行する]{
source add_files.tclのパス
//}

//image[xilinx/add/0][add_files.tclを実行する]

ソースファイルが追加されました(@<img>{xilinx/add/1})。

//image[xilinx/add/1][ソースファイルが追加された]

==={pynq.new_top} Verilogのトップモジュールを作成する

VerylファイルはSystemVerilogファイルに変換されますが、
VivadoではトップモジュールにSystemVerilogファイルを使用できません。
この問題を回避するために、Verilogでtop_pynq_z1モジュールをインスタンス化するモジュールを記述します(@<list>{core_top_v.v.pynq_z1})。

//list[core_top_v.v.pynq_z1][PYNQ-Z1用の最上位モジュール (core_top_v.v)]{
#@mapfile(scripts/05b/pynq_z1/synth/pynq_z1/core_top_v.v)
module core_top_v #(
    parameter MEMORY_FILEPATH = ""
) (
    input wire          clk,
    input wire          rst,
    output wire [3:0]   led
);
    core_top_pynq_z1 #(
        .MEMORY_FILEPATH(MEMORY_FILEPATH)
    ) t (
        .clk(clk),
        .rst(rst),
        .led(led)
    );
endmodule
#@end
//}

@<code>{core_top_v.v}をadd_filesでプロジェクトに追加します(@<list>{vivado.add_files.core_top_v})。

//list[vivado.add_files.core_top_v][Tcl Consoleで実行する]{
add_files -norecurse core_top_v.vのパス
//}

==={pynq_z1.create_bd} ブロック図を作成する

Vivadoではモジュール間の接続をブロック図によって行えます。
設計したモジュールをブロック図に追加して、クロックやリセット、LEDの接続を行います。

==== ブロック図の作成とトップモジュールの設定

画面左のFlow Navigatorで@<code>{Create Block Design}を押してブロック図を作成します(@<img>{xilinx/bd/0})。

//image[xilinx/bd/0][IP INTEGRATOR > Create Block Design]

名前は適当なものに設定します(@<img>{xilinx/bd/1})。

//image[xilinx/bd/1][名前を入力する]

Sourcesタブに作成されたブロック図が追加されるので、右クリックして@<code>{Create HDL Wrapper...}を押します(@<img>{xilinx/bd/2})。

//image[xilinx/bd/2][Create HDL Wrapper...を押す]

そのままOKを押します(@<img>{xilinx/bd/3})。

//image[xilinx/bd/3][OKを押す]

ブロック図がVerilogモジュールになるので、
@<code>{Set as Top}を押して、これをトップモジュールにします(@<img>{xilinx/bd/4})。

//image[xilinx/bd/4][Set as Topを押す]

ブロック図がトップモジュールに設定されました(@<img>{xilinx/bd/5})。

//image[xilinx/bd/5][ブロック図がトップモジュールに設定された]

==== ブロック図の設計

Diagram画面でブロック図を組み立てます。

まず、core_top_vモジュールを追加します。
適当な場所で右クリックして、@<code>{Add Module...}を押します(@<img>{xilinx/bd/6})。

//image[xilinx/bd/6][Add Module...を押す]

core_top_vを選択して、OKを押します(@<img>{xilinx/bd/7})。

//image[xilinx/bd/7][core_top_vを選択する]

core_top_vが追加されるので、
ledポートをクリックして@<code>{Make External}を押します(@<code>{xilinx/bd/8})。

//image[xilinx/bd/8][Make Externalを押す]

led_0ポートが追加されました(@<img>{xilinx/bd/9})。
これがブロック図のoutputポートになります。

//image[xilinx/bd/9][led_0ポートが追加された]

led_0を選択して、左側のExternal Port PropertiesのNameをledに変更します。

//image[xilinx/bd/10][名前をledに変更した]

次に、+ボタンを押して
ZYNQ7 Processing System、
Processor System Reset、
Clocking Wizardを追加します(@<img>{xilinx/bd/11}、@<img>{xilinx/bd/12})。

//image[xilinx/bd/11][+ボタンを押す]
//image[xilinx/bd/12][3つIPを追加する]

上に@<code>{Designer Assistance Available}と出るので、@<code>{Run Block Automation}を押します(@<img>{xilinx/bd/13})。

//image[xilinx/bd/13][Run Block Automationを押す]

@<img>{xilinx/bd/14}のようになっていることを確認して、OKを押します。

//image[xilinx/bd/14][DDRとFIXED_IOが追加された]

@<img>{xilinx/bd/15}のようにポートを接続します。
接続元から接続先にドラッグすることでポートを接続できます。
また、proc_sys_reset_0のext_reset_inをMake Externalしてrstを作成してください。

//image[xilinx/bd/15][ポートを接続する]

ZYNQ7 Processing Systemのoutputポートには、100MHzのクロック信号@<code>{FCLK_CLK0}が定義されています。
これをそのままcore_top_vに供給しても良いですが、
現状のコードではcore_top_vが100MHzで動くように合成できません。
そのため、Clocking Wizardで50MHzに変換したクロックをcore_top_vに供給します。

clk_wiz_0をダブルクリックして、入力を50MHzに変換するように設定します。
clk_out1のRequestedを50に変更してください。
また、Enable Optional ～のresetとlockedのチェックを外します(@<img>{xilinx/bd/16})。

//image[xilinx/bd/16][Clocking Wizardの設定を変更する]

clk_wiz_0が少しコンパクトになりました(@<img>{xilinx/bd/17})。

//image[xilinx/bd/17][Clocking Wizardが変更された]

==={pynq_z1.create_constraint} 制約ファイルを作成する

ブロック図のrst、ledを、それぞれPYNQ-Z1のボタン(BTN0)、LED(LD0、LD1、LD2、LD3)に接続します。
接続の設定には物理制約ファイルを作成します。

@<code>{pynq.xdc}を作成し、次のように記述します(@<list>{pynq.xdc.pynq_z1})。

//list[pynq.xdc.pynq_z1][物理制約ファイル (pynq.xdc)]{
#@mapfile(scripts/05b/pynq_z1/synth/pynq_z1/pynq.xdc)
# reset (BTN0)
set_property -dict { PACKAGE_PIN D19 IOSTANDARD LVCMOS33} [ get_ports rst ]

# led (LD0 - LD4)
set_property -dict { PACKAGE_PIN R14 IOSTANDARD LVCMOS33 } [ get_ports led[0] ];
set_property -dict { PACKAGE_PIN P14 IOSTANDARD LVCMOS33 } [ get_ports led[1] ];
set_property -dict { PACKAGE_PIN N16 IOSTANDARD LVCMOS33 } [ get_ports led[2] ];
set_property -dict { PACKAGE_PIN M14 IOSTANDARD LVCMOS33 } [ get_ports led[3] ];
#@end
//}

@<list>{pynq.xdc.pynq_z1}では、
rstにD19を割り当てて、
led[0]、led[1]、led[2]、led[3]にR14、P14、N16、M14を割り当てます(@<img>{pynq_z1_gpio})。
ボタンは押されていないときに@<code>{1}、押されているときに@<code>{0}になります。
LEDは@<code>{1}のときに点灯して、@<code>{0}のときに消灯します。

//image[pynq_z1_gpio][LEDとボタン][width=50%]

#@# @<bib>{pynq_z1.manual}

==={pynq_z1.test} テスト

===={pynq_z1.test.led} LEDの点灯を確認する

ブロック図のcore_top_v_0をダブルクリックすることで、
core_top_vモジュールの@<code>{MEMORY_FILEPATH}パラメータを変更します。
パラメータにはテストのHEXファイルのパスを設定します(@<img>{xilinx/program/0})。
LEDの点灯のテストのために@<code>{test/led.hex}のパスを入力します。

//image[xilinx/program/0][テストのHEXファイルのパスを設定する]

PROGRAM AND DEBUGの@<code>{Generate Bitstream}を押して合成と配置配線を実行します(@<img>{xilinx/program/1})。

//image[xilinx/program/1][合成、配置配線]

合成が完了したら@<code>{Open Hardware Manager}を押して、
開かれたHARDWARE MANAGERの@<code>{Open Target}の@<code>{Auto Connect}を押してPYNQ-Z1と接続します(@<img>{xilinx/program/2})。

//image[xilinx/program/2][PYNQ-Z1を接続する]

@<code>{Program device}を押すと、PYNQ-Z1に設計が書き込まれます。

//image[xilinx/program/3][設計を書き込む]

LEDが点灯しているのを確認できます(@<img>{pynq_z1_test_led})。
BTN0を押すとLEDが消灯します。

//image[pynq_z1_test_led][LEDの制御用レジスタの値が12(@<code>{64'b1100})なので、LD3、LD2が点灯する]

===={pynq_z1.test.blink} LEDの点滅を確認する


core_top_vモジュールの@<code>{MEMORY_FILEPATH}パラメータの値を@<code>{test/ledcounter.hex}のパスに変更して、
再度@<code>{Generate Bitstream}を実行します。

Hardware Managerを開いてProgram deviceを押すとLEDが点滅します@<fn>{pynq_z1.led_counter}。
BTN0を押すと状態がリセットされます。

//raw[|html|<iframe width="100%" max-width="640" style="aspect-ratio: 16 / 9;" src="https://www.youtube.com/embed/byCr_464dW4" title="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>]

//footnote[pynq_z1.led_counter][@<href>{https://youtu.be/byCr_464dW4}]