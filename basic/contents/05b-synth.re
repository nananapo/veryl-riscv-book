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

#@# //info[もう少し安いFPGA]{
#@# 数万円もするFPGAはなかなか手が出せません。
#@# 本章の範囲では
#@# Tang Nano 9K(3000円くらい)、
#@# Tang Primer 20K(7000円くらい)、
#@# Tang Primer 25K(6000円くらい)などの少し小規模で安価なFPGAでも動作させることができるはずです。
#@# 手始めにTang Nano 9Kを選ぶのも良いでしょう。
#@# //}

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
module top (
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

//warning[執筆中!!!]{
未完成
//}

#@# === 合成用の最上位モジュールの作成

#@# topモジュールをインスタンス化
#@# ファイルを設定

#@# === プロジェクトの作成

#@# GW5AST-LV138FPG676AC1/10  
#@# https://wiki.sipeed.com/hardware/en/tang/tang-mega-138k/mega-138k-pro.html

#@# ファイルのインポート  
#@# //list[][]{
#@# import_files -force --fileList ../../core/core.f
#@# //}

#@# config

#@# SystemVerilog 2017
#@# core_top_tangmega138k

#@# === 周波数の設定

#@# クロックは50MHzなので、sdcに書いておく

#@# //list[][]{
#@# create_clock -name clk -period 20 -waveform {0 10} [get_ports {clk}]
#@# //}

#@# 合成したらわかることだが、50MHzにできない
#@# そのためPLLを挟んで10MHzにする。

#@# === 物理制約の設定

#@# 制約
#@# //list[][]{
#@# // Clock and Reset
#@# IO_LOC "clk" P16;
#@# IO_LOC "rst" K16;
#@# IO_PORT "clk" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=OFF BANK_VCCIO=3.3;
#@# IO_PORT "rst" IO_TYPE=LVCMOS33 PULL_MODE=UP BANK_VCCIO=3.3;

#@# // LED
#@# IO_LOC "led[0]" J14;
#@# IO_LOC "led[1]" R26;
#@# IO_LOC "led[2]" L20;
#@# IO_LOC "led[3]" M25;
#@# IO_LOC "led[4]" N21;
#@# IO_LOC "led[5]" N23;
#@# IO_PORT "led[0]" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=8 BANK_VCCIO=3.3;
#@# IO_PORT "led[1]" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=8 BANK_VCCIO=3.3;
#@# IO_PORT "led[2]" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=8 BANK_VCCIO=3.3;
#@# IO_PORT "led[3]" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=8 BANK_VCCIO=3.3;
#@# IO_PORT "led[4]" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=8 BANK_VCCIO=3.3;
#@# IO_PORT "led[5]" IO_TYPE=LVCMOS33 PULL_MODE=NONE DRIVE=8 BANK_VCCIO=3.3;
#@# //}

== FPGAへの合成② (PYNQ-Z1)

