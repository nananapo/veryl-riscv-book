= riscv-testsによるテスト

前の章で、RV32IのCPUを実装しました。
簡単なテストを作成して操作を確かめましたが、
まだテストできていない命令が複数あります。
そこで、riscv-testsというテストを利用することで、
CPUがある程度正しく動いているらしいことを確かめます。

== riscv-testsとは何か？

riscv-testsは、次のURLからソースコードをダウンロードすることができます。

riscv-software-src/riscv-tests : @<href>{https://github.com/riscv-software-src/riscv-tests}

riscv-testsは、RISC-Vのプロセッサ向けのユニットテストやベンチマークの集合です。
各命令や機能ごとにテストが用意されており、
これを利用することで簡単に実装を確かめることができます。

すべての命令のすべての場合を網羅するようなテストではないため、
riscv-testsをパスしても、確実に実装が正しいとは言えないことに注意してください。

== riscv-testsのビルド

//info[riscv-testsのビルドが面倒、もしくはよく分からなくなってしまった方へ]{
@<href>{https://github.com/nananapo/riscv-tests-bin/tree/bin4}

完成品を上記のURLにおいておきます。
core/test/riscv-tests以下にコピーしてください。
//}

=== riscv-testsのビルド

riscv-testsをcloneします。

//terminal[riscvtests.build][riscv-testsのclone]{
$ @<userinput>{git clone https://github.com/riscv-software-src/riscv-tests}
$ @<userinput>{cd riscv-tests}
$ @<userinput>{git submodule update --init --recursive}
//}

riscv-testsは、
プログラムの実行が@<code>{0x80000000}から始まると仮定した設定になっています。
しかし、今のところCPUはアドレス@<code>{0x00000000}から実行を開始するため、
リンカにわたす設定(@<code>{env/p/link.ld})を変更します。

//list[link.ld][riscv-tests/env/p/link.ld]{
OUTPUT_ARCH( "riscv" )
ENTRY(_start)

SECTIONS
{
  . = 0x00000000; @<balloon>{先頭を0x00000000に変更する}
//}

CPUのVerylプロジェクトのディレクトリ名をcoreとします。
riscv-testsをビルドする前に、coreの中に、
riscv-testsの成果物を保存するディレクトリを作成します。

//terminal[riscvtests.target][testディレクトリの作成]{
$ @<userinput>{cd core}
$ @<userinput>{mkdir test}
//}

riscv-testsをビルドします。

//terminal[riscvtests.autoconf][riscv-testsのビルド]{
$ @<userinput>{cd riscv-testsをcloneしたディレクトリ}
$ @<userinput>{autoconf}
$ @<userinput>{./configure --prefix=core/testへのパス}
$ @<userinput>{make}
$ @<userinput>{make install}
//}

core/testに、share/riscv-tests/isaが作成されます。

=== 成果物を$readmemhで読み込める形式に変換する

riscv-testsをビルドすることができましたが、
これは@<code>{$readmemh}システムタスクで読み込める形式(以降HEX形式と呼びます)ではありません。

CPUでテストを実行できるように、
ビルドしたテストのバイナリファイルをHEX形式に変換します。

まず、バイナリファイルをHEX形式に変換するPythonプログラム@<code>{test/bin2hex.py}を作成します。

//list[bin2hex.py][core/test/bin2hex.py]{
#@mapfile(scripts/04a/bin2hex/core/test/bin2hex.py)
#@end
//}

このプログラムは、
第二引数に指定されるバイナリファイルを、
第一引数に与えられた数のバイト毎に区切り、
16進数のテキストで出力します。

例えば@<code>{test/share/riscv-tests/isa/rv32ui-p-add}はELFファイルです。
CPUはELFを直接に実行する機能を持っていないため、
@<code>{riscv64-unknown-elf-objcopy}を利用して、
ELFファイルを余計な情報を取り除いたバイナリファイルに変換します。

//terminal[elf.bin][ELFファイルを変換する]{
$ @<userinput>{find share/ -type f -not -name "*.dump" -exec riscv32-unknown-elf-objcopy -O binary {\} {\}.bin \;}
//}

変換されたバイナリファイルを、
PythonプログラムでHEXファイルに変換します。

//terminal[bin.hex][バイナリファイルをHEXファイルに変換する]{
$ @<userinput>{find share/ -type f -name "*.bin" -exec python3 bin2hex.py 4 {\} \;}
//}

== どのようにテストを実行するのか

riscv-testsには複数のテストが用意されていますが、
本章では、名前が@<code>{rv32ui-p-}から始まるRV32I向けのテストを利用します。

例えば、ADD命令のテストである@<code>{rv32ui-p-add.dump}を読んでみます。
@<code>{rv32ui-p-add.dump}は、@<code>{rv32ui-p-add}のダンプファイルです。

//list[rv32ui-p-add.dump][rv32ui-p-add.dump]{
Disassembly of section .text.init:

00000000 <_start>:
   0:	0500006f          	j	50 <reset_vector>

00000004 <trap_vector>:
   4:	34202f73          	csrr	t5,mcause @<balloon>{t5 = mcause}
  ...
  18:	00b00f93          	li	t6,11
  1c:	03ff0063          	beq	t5,t6,3c <write_tohost>
  ...

0000003c <write_tohost>: @<balloon>{0x1000にテスト結果を書き込む}
  3c:	00001f17          	auipc	t5,0x1
  40:	fc3f2223          	sw	gp,-60(t5) # 1000 <tohost>
  ...

00000050 <reset_vector>:
  50:	00000093          	li	ra,0
 ... 	@<balloon>{レジスタ値のゼロ初期化}
  c8:	00000f93          	li	t6,0
 ...	@<balloon>{↓mtvecにtrap_vectorのアドレスを書き込む}
 130:	00000297          	auipc	t0,0x0
 134:	ed428293          	addi	t0,t0,-300 # 4 <trap_vector>
 138:	30529073          	csrw	mtvec,t0
 ...	@<balloon>{↓mepcにtest_2のアドレスを書き込む}
 178:	00000297          	auipc	t0,0x0
 17c:	01428293          	addi	t0,t0,20 # 18c <test_2>
 180:	34129073          	csrw	mepc,t0
 ...	@<balloon>{↓mretを実行し、mepcのアドレス=test_2にジャンプする}
 188:	30200073          	mret

0000018c <test_2>: @<balloon>{0 + 0 = 0のテスト}
 18c:	00200193          	li	gp,2 @<balloon>{gp = 2}
 190:	00000593          	li	a1,0
 194:	00000613          	li	a2,0
 198:	00c58733          	add	a4,a1,a2
 19c:	00000393          	li	t2,0
 1a0:	4c771663          	bne	a4,t2,66c <fail>
 ...
0000066c <fail>: @<balloon>{失敗したときのジャンプ先}
 ... @<balloon>{↓gpを1以外の値にする}
 674:	00119193          	sll	gp,gp,0x1
 678:	0011e193          	or	gp,gp,1
 ...
 684:	00000073          	ecall

00000688 <pass>: @<balloon>{すべてのテストに成功したときのジャンプ先}
 ...
 68c:	00100193          	li	gp,1 @<balloon>{gp = 1}
 690:	05d00893          	li	a7,93
 694:	00000513          	li	a0,0
 698:	00000073          	ecall
 69c:	c0001073          	unimp
//}

riscv-testsは、基本的に次のような流れで実行されます。

 1. _start : reset_vectorにジャンプする
 2. reset_vector : 各種状態を初期化する
 3. test_* : テストを実行する。命令の結果がおかしかったらfailに飛ぶ。最後まで正常に実行できたらpassに飛ぶ。
 4. fail, pass : テストの成否をレジスタに書き込み、trap_vectorに飛ぶ
 5. trap_vector : write_tohostに飛ぶ
 6. write_tohost : テスト結果をメモリに書き込む。ここでループする

_startから実行を開始し、最終的にwrite_tohostに移動します。
テスト結果はメモリの@<code>{0x1000}に書き込まれます。

@<code>{mcause}, @<code>{mtvec}, @<code>{mepc}はCSRです。
riscv-testsの実装には少なくともこの3つの実装が必要です。

== mret

== mepc

== mcauseレジスタの実装

== riscv-testsの終了を検知する

riscv-testsが終了したことを検知し、それが成功か失敗かどうかを報告する必要があります。

riscv-testsは終了したことを示すためにメモリのあああ番地に値を書き込みます。
この値が1のとき、riscv-testsが正常に終了したことを示します。
それ以外の時は、riscv-testsが失敗したことを示します。

riscv-testsの終了の検知処理をtopモジュールに記述します。

プログラム

== テストの実行

試しにaddのテストを実行してみましょう。
add命令のテストはrv32ui-p-add.bin.hexに格納されています。
これを、メモリのreadmemhで読み込むファイルに指定します。

プログラム

ビルドして実行し、正常に動くことを確認します。

== 複数のテストを自動で実行する

add以外の命令もテストしたいですが、そのためにreadmemhを書き換えるのは大変です。
これを簡単にするために、readmemhにはマクロで指定する定数を渡します。

プログラム

自動でテストを実行し、その結果を報告するプログラムを作成します。

プログラム

このPythonプログラムは、riscv-testsフォルダにあるhexファイルについてテストを実行し、結果を報告します。
引数に対象としたいプログラムの名前の一部を指定することができます。

今回はRV32Iのテストを実行したいので、riscv-testsのRV32I向けのテストの接頭辞であるrv32ui-p-引数に指定すると、次のように表示されます。
