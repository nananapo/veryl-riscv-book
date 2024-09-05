= デバッグのための環境の整備

CPUを記述するとき、バグを生まずに実装するのは不可能です。
シミュレーション時にバグを見つけることができればいいのですが、
CPUを製造した後にバグが見つかることもあります。
一度製造したハードウェアを修正するのは非常に難しいため、
CPUのベンダーはバグのことをエラッタ(errata)としてリスト化しており、
CPUの上で動くソフトウェアはエラッタを回避するようにプログラムしなければいけません。
そのため、バグのあるコードを記述してしまったときに
バグの存在にできるだけ早く気付けるようにしておくことが重要です。
また、バグがあることが判明したときはバグの原因を速く見つけられるような仕組みがあるといいでしょう。

本章では、テストを記述して実行する方法を確認した後、
バグの発生個所を速く見つけるための仕組みを作成します。

CPUでプログラムが正しく動くことを確認するには、
実装が正しいことを数学的に証明する, 
テストプログラムが正しく動くことを確認する, 
ランダムなプログラムを実行して問題なく動くことを確認する
など様々な手法がありますが、この中で最も簡単な手法はテストプログラムを実行することです。

CPUはプログラムを動かすために存在します。
まずはプログラムを動かしてみることから始めましょう。

== riscv-testsの実行

=== 実行する

riscv-tests (@<href>{https://github.com/riscv-software-src/riscv-tests}) とは、RISC-Vのテストスイートです。
riscv-testsを実行することで、
各命令がある程度正しく動くことを確認することができます。

プログラムを動かすのに一番手っ取り早いのは、すでに用意されたプログラムを動かすことです。
bluecoreにはコンパイル済みのriscv-testsのバイナリが含まれています。
試しにADD命令のテスト(rv32ui-p-add)を実行してみましょう。

//terminal[term-run-riscvtests][riscv-tests(rv32ui-p-add)を実行する]{
$ @<userinput>{make build}
$ @<userinput>{make verilator MEMFILE=test/riscv-tests-bin/rv32ui-p-add.bin.hex CYCLE=0}
(省略)
MEM ---
  00000040:fc3f2223
  stall        : 1
  is_mem_op    : 1
  is_csr_op    : 0
  funct3       :  2
  mem_out      : 00000093
  csr_out      : 00000000
WB ---
wdata: 00000001
test: Success
- /core/src/top.sv:128: Verilog $finish
- /core/src/top.sv:128: Second verilog $finish, exiting
//}

最終的に@<code>{test: Success}という文字が出力されたでしょうか?
もしSuccessではなくFailが出力されたりいつまでも出力されない場合、環境構築に失敗している可能性があります。
正しい手順を踏んでいるか確認してください。

==== make build
Verylのプログラムをそのままシミュレーションできる環境は今のところ存在しません。
そのため、まずは@<code>{make build}を実行してverylのプログラムをSystemVerilogに変換(コンパイル)します。
Makefileには@<code>{build}を実行したら、
core/で@<code>{make build}を実行するように記述されています(@<list>{makefile-build1})。

//list[makefile-build1][build (Makefile)]{
build:
    make -C ${core} build
//}

coreのMakefileのbuildを実行すると@<code>{veryl build}が実行される(@<list>{makefile-build2})ため、
これによってSystemVerilogプログラムが作成されます。

//list[makefile-build2][build (core/Makefile)]{
build:
    veryl build
//}

verylプログラムをコンパイルしたあとに@<code>{ls}コマンドを実行すると、
@<list>{term-run-build-ls}のように拡張子がverylのファイルと同じ名前のsvファイルが存在する状態になります。

//terminal[term-run-build-ls][make buildを実行した後のcore/src]{
$ @<userinput>{ls -R core/src}
core/src:
alu.sv       csrunit.sv         reg_forward.sv
alu.veryl    csrunit.veryl      reg_forward.veryl
alubr.sv     inst_decode.sv     svconfig.sv
alubr.veryl  inst_decode.veryl  top.sv
common       memunit.sv         top.veryl
core.sv      memunit.veryl      top_gowin.sv
core.veryl   packages           top_gowin.veryl

core/src/common:
fifo.sv     membus_if.sv     memory.sv
fifo.veryl  membus_if.veryl  memory.veryl

core/src/packages:
config.sv     corectrl.sv     csr.sv     eei.sv
config.veryl  corectrl.veryl  csr.veryl  eei.veryl
//}

コンパイル結果のSystemVerilogファイルを削除したい場合は、@<code>{make clean}, または@<code>{veryl clean}コマンドを実行します。

==== make verilator MEMFILE=~ CYCLE=~

@<code>{make verilator}コマンドは、Verilatorでシミュレーションを実行するためのコマンドです。
MEMFILEにメモリの初期値として読み込むファイルを指定し、CYCLEでシミュレーションの最長実行サイクル数(0で無制限)を指定します。
実行した@<code>{make verilator MEMFILE=test/riscv-tests-bin/rv32ui-p-add.bin.hex CYCLE=0}では、
メモリの初期値として@<code>{test/riscv-tests-bin/rv32ui-p-add.bin.hex}、最長実行サイクル数として@<code>{0}を指定しています。

==== riscv-tests.py

riscv-testsを実行するときに毎回オプションを指定するのは面倒です。
これを楽にするために自動でテストを実行するプログラム(test/riscv-tests.py)を用意してあります。

//terminal[term-run-riscv-tests.py][rv32ui-p-から始まるテストをすべて実行する]{
$ @<userinput>{cd test}
$ @<userinput>{make -C .. build}
$ @<userinput>{python3 riscv-tests.py -j 8 rv32ui-p-}
(省略)
PASS : rv32ui-p-xor.bin.hex
PASS : rv32ui-p-sw.bin.hex
PASS : rv32ui-p-xori.bin.hex
Test Result : 39 / 39
//}

@<list>{term-run-riscv-tests.py}のようにriscv-tests.pyを実行すると、
名前が@<code>{rv32ui-p-}から始まるテストを
並列実行数が8(@<code>{-j 8})で実行します。
RV32I向けのテストは39個あるため、それらがすべて実行され、
結果として39個中39個のテストにパスしたという結果が表示されます。

それぞれのテストの実行時のログはtest/resultsディレクトリに格納されます。
また、すべてのテストの成否についての情報はtest/result/results.txtに記録されます。

=== riscv-tests-binディレクトリ

test/riscv-tests-binディレクトリには、次のファイルが含まれています。

 * テストプログラムのバイナリ (*.bin)
 * バイナリをSystemVerilogの@<code>{$readmemh}タスクで読める形式に変換したファイル (*.bin.hex)
 * バイナリのダンプファイル (*.dump)

hexファイルは@<list>{hex-sample}のような形式になっています。
これに対応するdumpファイルは@<list>{dump-sample}です。
命令が一致しているのを確認できます。

//list[hex-sample][hexファイルの冒頭10行 (rv32ui-p-add.bin.hex)]{
0500006f
34202f73
00800f93
03ff0863
00900f93
03ff0463
00b00f93
03ff0063
00000f13
000f0463
//}

//list[dump-sample][dumpファイルの冒頭10命令 (rv32ui-p-add.dump)]{

rv32ui-p-add:     file format elf32-littleriscv


Disassembly of section .text.init:

00000000 <_start>:
   0:   0500006f                j       50 <reset_vector>

00000004 <trap_vector>:
   4:   34202f73                csrr    t5,mcause
   8:   00800f93                li      t6,8
   c:   03ff0863                beq     t5,t6,3c <write_tohost>
  10:   00900f93                li      t6,9
  14:   03ff0463                beq     t5,t6,3c <write_tohost>
  18:   00b00f93                li      t6,11
  1c:   03ff0063                beq     t5,t6,3c <write_tohost>
  20:   00000f13                li      t5,0
  24:   000f0463                beqz    t5,2c <trap_vector+0x28>
//}

@<list>{hexdump-add}でbinファイルを確認すると、
最初の命令@<code>{0500006f}が@<code>{157 000 000 005}のように、
リトルエンディアン形式で格納されていることが分かります。
bluecoreのメモリは4byteのデータを1byte単位のビッグエンディアン形式で値を格納しているため、
リトルエンディアン形式をビッグエンディアン形式に変換したファイルを作成する必要があります。

//terminal[hexdump-add][1byte単位でhexdumpする]{
$ @<userinput>{hexdump -b riscv-tests-bin/rv32ui-p-add.bin | head -1}
0000000 157 000 000 005 163 057 040 064 223 017 200 000 143 010 377 003
//}

bluecoreにはリトルエンディアン形式からビッグエンディアン形式への変換を行うためにtest/bin2hex.pyが用意されています。
bin2hex.pyの使い方は@<list>{bin2hex-use}の通りです。
8byte単位でエンディアンを変換したい場合は、@<code>{4}を@<code>{8}に変更します。

//terminal[bin2hex-use][リトルエンディアン形式をビッグエンディアン形式に変換する]{
$ @<userinput>{python3 bin2hex.py 4 ファイル名 > 結果の保存先のファイル名}
$ # 例 : rv32ui-p-add.bin -> rv32ui-p-add.hex
$ @<userinput>{python3 bin2hex.py 4 riscv-tests-bin/rv32ui-p-add.bin > riscv-tests-bin/rv32ui-p-add.hex}
//}

=== riscv-testsの実行の流れ

さて、riscv-testsを実行できることを確かめたので、
riscv-testsはどのようなプログラムを実行してCPUの確からしさを確かめているのかを確認します。

riscv-testsは基本的に次のような流れで実行されていきます。

 1. _start : reset_vectorにジャンプする
 2. reset_vector : 各種状態を初期化する
 3. test_* : テストを実行する。命令の結果がおかしかったらfailに飛ぶ。最後まで正常に実行できたらpassに飛ぶ。
 4. fail, pass : テストの成否をレジスタに書き込み、trap_vectorに飛ぶ
 5. trap_vector : write_tohostに飛ぶ
 6. write_tohost : テスト結果をメモリに書き込む。ここでループする

プログラムを参照しながら流れを確認していきましょう。
test/riscv-tests-bin/rv32ui-p-add.dumpを開いてください。

==== 1. _start

bluecoreはリセットされるとアドレス0からプログラムの実行を開始します。
そのため、まずはアドレス0の_startからriscv-testsの実行がスタートします。
_startには、reset_vectorにジャンプする命令のみが記述されています。

//list[dump-start][_start (rv32ui-p-add.dump)]{
00000000 <_start>:
   0:	0500006f          	j	50 <reset_vector>
//}

//note[疑似命令(pseudo instruction)]{
j命令はRISC-Vの仕様書には定義されていません。
それでは一体_startに出てきたj命令とは何でしょうか? 
これはアセンブラでの記述を楽にするための疑似的な命令です。
実際にはj命令はjal命令にコンパイルされます。
j命令の機械語@<code>{0500006f}を
RISC-Vのデコーダー(@<href>{https://luplab.gitlab.io/rvcodecjs/#q=0500006f})で確認してみると
@<code>{jal x0, 80}と解釈されます。
このことからj命令はjalのPCの保存先レジスタ(rd)がx0である、
つまりジャンプだけしてリンクしない命令であることが分かります。
//}

==== 2. reset_vector

reset_vectorではテストを実行するための準備を整えます。
ここで今のところ注目する必要があるのは、
レジスタの初期化(@<list>{dump-reset-reg})とテストへジャンプするためのコード(@<list>{dump-reset-jump})です。
レジスタの初期化部分では、0番目のレジスタ以外のレジスタの値を0に設定しています@<fn>{fn_why_zero_is_not}。
//footnote[fn_why_zero_is_not][RISC-Vの0番目のレジスタ(x0, zero)は常に0であることが保証されています]

//list[dump-reset-reg][レジスタの0初期化 (rv32ui-p-add.dump)]{
00000050 <reset_vector>:
  50:	00000093          	li	ra,0
  54:	00000113          	li	sp,0
  (省略)
  c4:	00000f13          	li	t5,0
  c8:	00000f93          	li	t6,0
//}

//list[dump-reset-jump][テストにジャンプするためのコード (rv32ui-p-add.dump)]{
 174:	30005073          	csrw	mstatus,0
 178:	00000297          	auipc	t0,0x0
 17c:	01428293          	add	t0,t0,20 # 18c <test_2>
 180:	34129073          	csrw	mepc,t0
 184:	f1402573          	csrr	a0,mhartid
 188:	30200073          	mret
//}

テストにジャンプするためのコードでは次のようになっています。

 1. 174: CSRのmstatusレジスタを0に設定する
 2. 180: mepcをテスト開始場所(test_2)に設定する
 3. 188: MRET命令でテスト開始場所にジャンプ

ジャンプするための命令はMRET命令です。
M-modeのときにMRET命令が実行されると、
モードをmstatusレジスタのMPPビット(幅は2bit)に保存されている数値で表される権限レベルのモードに設定し、
PCをmepcレジスタに設定された値に設定(ジャンプ)します。

riscv-testsのrv32ui-p-addでは、テストをU-modeで実行することを想定しています。
そのため、mstatusレジスタに0を設定することでmstatusのMPPビットを0に設定し、U-modeに遷移するようにしています。
また、mepcレジスタにtest_2のアドレスを設定することで、テスト開始場所にジャンプするようにしています。

なお、今のところbluecoreはU-modeやmstatusレジスタをサポートしていないため、
mret命令は常にM-modeからS-modeにモードを変更し、mepcにジャンプするような命令になっています。

==== 3. test_*

test_*では命令のテストを実行します。
@<list>{dump-test_2}はADD命令のテストの1つです。
このテストでは、raレジスタに0, spレジスタに0をロードし、raとspを足した値をa4レジスタに格納しています。
足し算の結果が正しいことを確認するために、0と一致しない場合にはfailに遷移します。

//list[dump-test_2][test_2 (rv32ui-p-add.dump)]{
0000018c <test_2>:
 18c:	00200193          	li	gp,2
 190:	00000093          	li	ra,0
 194:	00000113          	li	sp,0
 198:	00208733          	add	a4,ra,sp
 19c:	00000393          	li	t2,0
 1a0:	4c771663          	bne	a4,t2,66c <fail>
//}

最後のテストでは、failに遷移しなかった場合にはpassに遷移します(@<list>{dump-test_last})。
よって、テストに失敗した場合にはfailに遷移し、成功した場合にはpassに遷移します。

//list[dump-test_last][test_38(最後のテスト) (rv32ui-p-add.dump)]{
00000650 <test_38>:
 650:	02600193          	li	gp,38
 654:	01000093          	li	ra,16
 658:	01e00113          	li	sp,30
 65c:	00208033          	add	zero,ra,sp
 660:	00000393          	li	t2,0
 664:	00701463          	bne	zero,t2,66c <fail>
 668:	02301063          	bne	zero,gp,688 <pass>
//}

各テストでは、テスト開始前にgpレジスタにテストごとに固有の値を格納しています。
例えばtest_2では@<code>{2}を、test_38では@<code>{38}を格納しています。
この値は0以外になっています。

==== 4. fail, pass

fail, passでは、gpレジスタに成功したか失敗したかを示す値を格納した後、
ECALL命令でtrap_vectorに遷移します。
ECALL命令は例外を発生させることで現在の権限レベルよりも高い権限のモードに移動するための命令@<fn>{fn_ecall}です。
//footnote[fn_ecall][現在の権限レベルと同じ権限のままの場合もあります]

RISC-Vには、例外が発生してM-modeに遷移するとき、
mcauseレジスタに例外の発生原因を格納し、
mepcレジスタに格納されているPCに遷移すると定義されています。
bluecoreは例外が発生するときに常にM-modeに遷移します。
reset_vectorでmepcにtrap_vectorのアドレスを設定しているため、fail, testはECALL命令によってtrap_vectorに遷移します。

//list[dump-fail][fail (rv32ui-p-add.dump)]{
0000066c <fail>:
 66c:	0ff0000f          	fence
 670:	00018063          	beqz	gp,670 <fail+0x4>
 674:	00119193          	sll	gp,gp,0x1
 678:	0011e193          	or	gp,gp,1
 67c:	05d00893          	li	a7,93
 680:	00018513          	mv	a0,gp
 684:	00000073          	ecall
//}

//list[dump-pass][test (rv32ui-p-add.dump)]{
00000688 <pass>:
 688:	0ff0000f          	fence
 68c:	00100193          	li	gp,1
 690:	05d00893          	li	a7,93
 694:	00000513          	li	a0,0
 698:	00000073          	ecall
//}

@<list>{dump-fail}では、gpレジスタに格納された値を左に1bitシフトし、最下位ビットを1にしています。
@<list>{dump-pass}では、gpレジスタに1を格納しています。
これにより、gpレジスタによってテストに成功したか失敗したかを区別することができます。

==== 5. trap_vector

trap_vectorでは、mcauseレジスタの値をロードし、その値が不正なものではないことを確認したらwrite_tohostにジャンプします。

bluecoreでriscv-testsを実行するときは、fail,passのECALL命令によってS-modeからM-modeに遷移します。
そのため、mcauseレジスタにはS-modeからのEnvironment Callが原因であるとして@<code>{9}が格納されています。
これがアドレス@<code>{14}で確かめられ、write_tohostにジャンプします。

//list[dump-trap_vector][trap_vector (rv32ui-p-add.dump)]{
00000004 <trap_vector>:
   4:	34202f73          	csrr	t5,mcause
   8:	00800f93          	li	t6,8
   c:	03ff0863          	beq	t5,t6,3c <write_tohost>
  10:	00900f93          	li	t6,9
  14:	03ff0463          	beq	t5,t6,3c <write_tohost>
  18:	00b00f93          	li	t6,11
  1c:	03ff0063          	beq	t5,t6,3c <write_tohost>
  20:	00000f13          	li	t5,0
  24:	000f0463          	beqz	t5,2c <trap_vector+0x28>
  28:	000f0067          	jr	t5
  2c:	34202f73          	csrr	t5,mcause
  30:	000f5463          	bgez	t5,38 <handle_exception>
  34:	0040006f          	j	38 <handle_exception>
//}

==== 6. write_tohost

write_tohostでは、
gpレジスタの値をtohost(0x1000)に書き込む命令を実行することによってriscv-testsの結果を報告します。

tohostのアドレスはriscv-testsをコンパイルする際に設定します。
riscv-testsのコンパイルについては別の章で解説します。

//list[dump-write_tohost][write_tohost (rv32ui-p-add.dump)]{
0000003c <write_tohost>:
  3c:	00001f17          	auipc	t5,0x1
  40:	fc3f2223          	sw	gp,-60(t5) # 1000 <tohost>
  44:	00001f17          	auipc	t5,0x1
  48:	fc0f2023          	sw	zero,-64(t5) # 1004 <tohost+0x4>
  4c:	ff1ff06f          	j	3c <write_tohost>
//}

=== riscv-testsの結果を確認するための仕組み

riscv-testsは特定のアドレスに値を書き込むことによって結果を確認することを説明しました。
bluecoreではメモリとcoreを接続するtopモジュールでriscv-testsの結果を確認しています。

//list[bluecore-riscvtests-check][riscv-testsの結果を確認するコード (top.veryl)]{
#@maprange(scripts/sec4/core/src/top.veryl,riscv_tests_check)
    always_ff (clk, rst) {
        if_reset {
            test_state = TestState::Reset;
        } else {
            // riscv-tests tohostでの書き込みを検知する
            if dbus_if.valid & dbus_if.wen & dbus_if.addr == RISCVTESTS_EXIT_ADDR {
                $display("wdata: %h", dbus_if.wdata);
                // 成功したかどうかを出力する
                if dbus_if.wdata == RISCVTESTS_WDATA_SUCCESS {
                    $display  ("test: Success");
                    test_state = TestState::Success;
                } else {
                    $error    ("test: Fail");
                    test_state = TestState::Fail;
                }
                // テスト終了
                $finish();
            } else {
                if test_state == TestState::Reset {
                    test_state = TestState::Running;
                }
            }
        }
    }
#@end
//}

@<code>{dbus_if}を監視し、
書き込み要求かつアドレスが@<code>{RISCVTESTS_EXIT_ADDR}のとき、
書き込む値をチェックします。
@<code>{wdata}が@<code>{RISCVTESTS_WDATA_SUCCESS}のときは成功、
それ以外のときは失敗とし、@<code>{finish}システムタスクでシミュレーションを終了します。
@<code>{RISCVTESTS_}から始まる値はeeiパッケージで定義されています。

=== テストのためのオプションを実装する (book-sec5-impl-test-option)

さて、topモジュールでriscv-testsの終了チェックを行っているわけですが、
チェック処理はriscv-testsではないプログラムを実行しているときも動いてしまいます。
このままでは普通のプログラムを実行するときにシミュレーションが止まってしまうため不便です。
これをテストを実行しているというオプションを追加することで、
チェック処理を動かさないようにします。

テストを実行するかどうかはシミュレーションの実行時に指定できると良いです。
そのために、マクロの有無でオプションを指定できるようにします。

//list[sec5-impl-test-option_svconfig][マクロと連動したパラメータを記述する (svconfig.sv)]{
#@maprange(scripts/sec5-impl-test-option/core/src/svconfig.sv,config)
    // テストモードかどうか
    `ifdef ENV_TEST
        localparam ENV_TEST = 1;
    `else
        localparam ENV_TEST = 0;
    `endif

    // テストモードの時、結果を書き込むアドレス
    `ifndef TEST_EXIT_ADDR
        `define TEST_EXIT_ADDR 'h1000
    `endif
    localparam TEST_EXIT_ADDR = `TEST_EXIT_ADDR;

    // テストモードの時、結果が成功の時に書き込まれる値
    `ifndef TEST_WDATA_SUCCESS
        `define TEST_WDATA_SUCCESS 1
    `endif
    localparam TEST_WDATA_SUCCESS = `TEST_WDATA_SUCCESS;
#@end
//}

bluecoreではマクロをsvconfigパッケージで利用しています。
ここで@<list>{sec5-impl-test-option_svconfig}のように、
マクロの有無によって値が変わるパラメータ(@<code>{ENV_TEST})を定義します。
加えて、結果を書き込むアドレスと成功を示す値をマクロで指定できるようにします。
eeiパッケージに定義されている@<code>{RISCVTESTS_EXIT_ADDR}と@<code>{RISCVTESTS_WDATA_SUCCESS}を削除し、
代わりに@<code>{TEST_EXIT_ADDR}と@<code>{TEST_WDATA_SUCCESS}を定義します。


//list[sec5-impl-test-option_config][SystemVerilogのパッケージのパラメータをラップする (packages/config.veryl)]{
#@maprange(scripts/sec5-impl-test-option/core/src/packages/config.veryl,config)
package config {
    local MEMORY_INITIAL_FILE: string     = $sv::svconfig::MEMORY_INITIAL_FILE;
    local ENV_TEST           : bit        = $sv::svconfig::ENV_TEST;
    local TEST_EXIT_ADDR     : logic <32> = $sv::svconfig::TEST_EXIT_ADDR;
    local TEST_WDATA_SUCCESS : logic <32> = $sv::svconfig::TEST_WDATA_SUCCESS;
}
#@end
//}

svconfig.verylで定義したパラメータを$svキーワードを利用しないで利用するために、
@<list>{sec5-impl-test-option_config}のように
configパッケージで$svキーワードを利用したパラメータを定義します。

//list[sec5-impl-test-option_top][チェック処理でパラメータを利用する (top.veryl)]{
#@maprange(scripts/sec5-impl-test-option/core/src/top.veryl,if)
    if ENV_TEST :test_check {
        always_ff (clk, rst) {
            if_reset {
                test_state = TestState::Reset;
            } else {
                // テストの結果を書き込むアドレスへの書き込みを検知
                if dbus_if.valid & dbus_if.wen & dbus_if.addr == TEST_EXIT_ADDR {
                    $display("wdata: %h", dbus_if.wdata);
                    // 成功したかどうかを出力する
                    if dbus_if.wdata == TEST_WDATA_SUCCESS {
#@end
//}


そうしたら、topモジュールのチェック処理をif文で囲いましょう。
configパッケージはtop.verylの先頭でファイルスコープでimportされているため、
パッケージスコープを指定せずに使用することができます。

//list[sec5-impl-test-option_py-define][新しく記述する変数 (riscv-tests.py)]{
#@maprange(scripts/sec5-impl-test-option/test/riscv-tests.py,define)
TEST_EXIT_ADDR = "\\'h1000"
TEST_WDATA_SUCCESS = "1"
#@end
//}

//list[sec5-impl-test-option_py-option][コマンドのオプションを追加する (riscv-tests.py)]{
#@maprange(scripts/sec5-impl-test-option/test/riscv-tests.py,impl)
if len(args) == 0 or fileName.find(args[0]) != -1:
    mcmd = MAKE_COMMAND_VERILATOR
    options = []
    options.append("MEMFILE="+abpath)
    options.append("CYCLE=5000")
    options.append("MDIR="+fileName+"/")

    otherOptions = []
    otherOptions.append("-DENV_TEST")
    otherOptions.append("-DTEST_EXIT_ADDR="+TEST_EXIT_ADDR)
    otherOptions.append("-DTEST_WDATA_SUCCESS="+TEST_WDATA_SUCCESS)
    options.append("OPTION=\"" + " ".join(otherOptions) + "\"")

    processes.append(executor.submit(test, mcmd + " " + " ".join(options), fileName))
#@end
//}

最後にriscv-tests.pyでmakeコマンドのオプションを指定するようにします。
@<list>{sec5-impl-test-option_py-define}のように、
ファイルの先頭にテストの結果を書き込むアドレス(@<code>{TEST_EXIT_ADDR})と
テストが成功したときに書き込まれる値を示す変数を定義します。
これを@<list>{sec5-impl-test-option_py-define}のように
@<code>{OPTION=}の中にマクロの定義として展開することで、
@<code>{make verilator}コマンドを実行するときにマクロが定義されるようになりました。

//terminal[term-run-rv32ui-check][riscv-testsが正常に動くことを確認する]{
$ @<userinput>{make build}
$ @<userinput>{cd test}
$ @<userinput>{python3 riscv-tests.py -j 8 rv32ui-p-}
(省略)
PASS : rv32ui-p-xor.bin.hex
PASS : rv32ui-p-sw.bin.hex
PASS : rv32ui-p-xori.bin.hex
Test Result : 39 / 39
//}

@<code>{make build}コマンドでビルドしなおしたら、
riscv-tests.pyを実行することでriscv-testsが正常に動作することを確認しましょう。
通常のプログラムが動かせるかについては次の節で確認します。

この項での変更は@<code>{book-sec5-impl-test-option}タグで確認することができます。

== プログラムを作成して実行する

== ログの整備

ログの整備

== Spikeとの比較

== メモリ操作の追跡

== ストールの検知

== ビジュアライズ
Konata