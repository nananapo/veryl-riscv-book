= riscv-testsによるテスト

@<chap>{04-impl-rv32i}では、RV32IのCPUを実装しました。
簡単なテストを作成して操作を確かめましたが、
まだテストできていない命令が複数あります。
そこで、riscv-testsというテストを利用することで、
CPUがある程度正しく動いているらしいことを確かめます。

== riscv-testsとは何か?

riscv-testsは、
GitHubの@<href>{https://github.com/riscv-software-src/riscv-tests, riscv-software-src/riscv-tests}
からソースコードをダウンロードすることができます。

riscv-testsは、RISC-Vのプロセッサ向けのユニットテストやベンチマークの集合です。
命令や機能ごとにテストが用意されており、
これを利用することで簡単に実装を確かめることができます。
すべての命令のすべての場合を網羅するようなテストではないため、
riscv-testsをパスしても、確実に実装が正しいとは言えないことに注意してください。

== riscv-testsのビルド

//info[riscv-testsのビルドが面倒、もしくはよく分からなくなってしまった方へ]{
@<href>{https://github.com/nananapo/riscv-tests-bin/tree/bin4}

完成品を上記のURLにおいておきます。
core/test以下にコピーしてください。
//}

=== riscv-testsをビルドする

まず、riscv-testsをcloneします
(@<list>{riscv-tests.build})。

//terminal[riscv-tests.build][riscv-testsのclone]{
$ @<userinput>{git clone https://github.com/riscv-software-src/riscv-tests}
$ @<userinput>{cd riscv-tests}
$ @<userinput>{git submodule update --init --recursive}
//}

riscv-testsは、
プログラムの実行が@<code>{0x80000000}から始まると仮定した設定になっています。
しかし、今のところ、CPUはアドレス@<code>{0x00000000}から実行を開始するため、
リンカにわたす設定ファイル@<code>{env/p/link.ld}を変更する必要があります(@<list>{link.ld})。

//list[link.ld][riscv-tests/env/p/link.ld]{
OUTPUT_ARCH( "riscv" )
ENTRY(_start)

SECTIONS
{
  . = @<b>|0x00000000|; @<balloon>{先頭を0x00000000に変更する}
//}

riscv-testsをビルドします。
必要なソフトウェアがインストールされていない場合、適宜インストールしてください
(@<list>{riscvtests.autoconf})。

//terminal[riscvtests.autoconf][riscv-testsのビルド]{
$ @<userinput>{cd riscv-testsをcloneしたディレクトリ}
$ @<userinput>{autoconf}
$ @<userinput>{./configure --prefix=core/testへのパス}
$ @<userinput>{make}
$ @<userinput>{make install}
//}

core/testにshareディレクトリが作成されます。

=== 成果物を$readmemhで読み込める形式に変換する

riscv-testsをビルドすることができましたが、
これは@<code>{$readmemh}システムタスクで読み込める形式(以降HEX形式と呼びます)ではありません。

CPUでテストを実行できるように、
ビルドしたテストのバイナリファイルをHEX形式に変換します。

まず、バイナリファイルをHEX形式に変換するPythonプログラム@<code>{test/bin2hex.py}を作成します(@<list>{bin2hex.py})。

//list[bin2hex.py][core/test/bin2hex.py]{
#@mapfile(scripts/04b/bin2hex/core/test/bin2hex.py)
import sys

# 使い方を表示する
def print_usage():
    print(sys.argv[1])
    print("Usage:", sys.argv[0], "[bytes per line] [filename]")
    exit()

# コマンドライン引数を受け取る
args = sys.argv[1:]
if len(args) != 2:
    print_usage()
BYTES_PER_LINE = None
try:
    BYTES_PER_LINE = int(args[0])
except:
    print_usage()
FILE_NAME = args[1]

# バイナリファイルを読み込み
allbytes = []
with open(FILE_NAME, "rb") as f:
    allbytes = f.read()

# 値を文字列に変換する
bytestrs = []
for b in allbytes:
    bytestrs.append(format(b, '02x'))

# 00を足すことでBYTES_PER_LINEの倍数に揃える
bytestrs += ["00"] * (BYTES_PER_LINE - len(bytestrs) % BYTES_PER_LINE)

# 出力
results = []
for i in range(0, len(bytestrs), BYTES_PER_LINE):
    s = ""
    for j in range(BYTES_PER_LINE):
        s += bytestrs[i + BYTES_PER_LINE - j - 1]
    results.append(s)
print("\n".join(results))
#@end
//}

このプログラムは、
第二引数に指定されるバイナリファイルを、
第一引数に与えられた数のバイト毎に区切り、
16進数のテキストで出力します。

HEXファイルに変換する前に、ビルドした成果物を確認する必要があります。
例えば@<code>{test/share/riscv-tests/isa/rv32ui-p-add}はELFファイルです。
CPUはELFを直接に実行する機能を持っていないため、
@<code>{riscv64-unknown-elf-objcopy}を利用して、
ELFファイルを余計な情報を取り除いたバイナリファイルに変換します(@<list>{elf.bin})。

//terminal[elf.bin][ELFファイルを変換する]{
$ @<userinput>{find share/ -type f -not -name "*.dump" -exec riscv32-unknown-elf-objcopy -O binary {\} {\}.bin \;}
//}

最後に、objcopyで生成されたbinファイルを、
PythonプログラムでHEXファイルに変換します(@<list>{bin.hex})。

//terminal[bin.hex][バイナリファイルをHEXファイルに変換する]{
$ @<userinput>{find share/ -type f -name "*.bin" -exec sh -c "python3 bin2hex.py 4 {\} > {\}.hex" \;}
//}

== テスト内容の確認

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

riscv-testsは、基本的に次の流れで実行されます。

 1. _start : reset_vectorにジャンプする
 2. reset_vector : 各種状態を初期化する
 3. test_* : テストを実行する。命令の結果がおかしかったらfailに飛ぶ。最後まで正常に実行できたらpassに飛ぶ。
 4. fail, pass : テストの成否をレジスタに書き込み、trap_vectorに飛ぶ
 5. trap_vector : write_tohostに飛ぶ
 6. write_tohost : テスト結果をメモリに書き込む。ここでループする

_startから実行を開始し、最終的にwrite_tohostに移動します。
テスト結果はメモリの@<code>{.tohost}に書き込まれます。
@<code>{.tohost}のアドレスは、リンカの設定ファイルに記述されています(@<list>{link.ld.tohost})。
プログラムのサイズは@<code>{0x1000}よりも小さいため、
@<code>{.tohost}のアドレスは@<code>{0x1000}になります。

//list[link.ld.tohost][riscv-tests/env/p/link.ld]{
OUTPUT_ARCH( "riscv" )
ENTRY(_start)

SECTIONS
{
  . = 0x00000000;
  .text.init : { *(.text.init) }
  . = ALIGN(0x1000);
  .tohost : { *(.tohost) }
//}

== テストの終了検知

テストを実行する場合、
テストが終了したことを検知し、
それが成功か失敗かどうかを報告する必要があります。

riscv-testsは、
テストが終了したことを示すために、
@<code>{.tohost}に値を書き込みます。
この値が1のとき、riscv-testsが正常に終了したことを示します。
それ以外の時は、riscv-testsが失敗したことを示します。

riscv-testsが終了したことを検知する処理をtopモジュールに記述します。
topモジュールでメモリへのアクセスを監視し、
@<code>{.tohost}に値が書き込まれたら実行を終了します
(@<list>{top.veryl.detect-finish-range.detect})。

//list[top.veryl.detect-finish-range.detect][メモリアクセスを監視して終了を検知する (top.veryl)]{
#@maprange(scripts/04b/detect-finish-range/core/src/top.veryl,detect)
    // riscv-testsの終了を検知する
    const RISCVTESTS_TOHOST_ADDR: Addr = 'h1000 as Addr;
    always_ff {
        if d_membus.valid && d_membus.ready && d_membus.wen == 1 && d_membus.addr == RISCVTESTS_TOHOST_ADDR {
            if d_membus.wdata == 1 {
                $display("riscv-tests success!");
            } else {
                $display("riscv-tests failed!");
                $error  ("wdata : %h", d_membus.wdata);
            }
            $finish();
        }
    }
#@end
//}

テストが失敗した場合、
つまり1以外の値が書き込まれた場合、
@<code>{$error}システムタスクを実行します。
これにより、テスト失敗時のシミュレータの終了コードが1になります。

== テストの実行

試しにADD命令のテストを実行してみましょう。
ADD命令のテストのHEXファイルは@<code>{test/share/riscv-tests/isa/rv32ui-p-add.bin.hex}です。

シミュレータを実行し、正常に動くことを確認します(@<list>{test.add.sim})。

//terminal[test.add.sim][ADD命令のriscv-testsを実行する]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{./obj_dir/sim test/share/riscv-tests/isa/rv32ui-p-add.bin.hex 0}
#                    4
00000000 : 0500006f
#                    8
00000050 : 00000093
...
#                  593
00000040 : fc3f2223
  itype     : 000100
  imm       : ffffffc4
  rs1[30]   : 0000103c
  rs2[ 3]   : 00000001
  op1       : 0000103c
  op2       : ffffffc4
  alu res   : 00001000
  mem stall : 1
  mem rdata : ff1ff06f
riscv-tests success!
- /home/kanataso/Documents/bluecore/core/src/top.sv:26: Verilog $finish
- /home/kanataso/Documents/bluecore/core/src/top.sv:26: Second verilog $finish, exiting
//}

@<code>{riscv-tests success!}と表示され、テストが正常終了しました@<fn>{if_not_success}。

//footnote[if_not_success][実行が終了しない場合はどこかしらにバグがあります。rv32ui-p-add.dumpと実行ログを見比べて、頑張って原因を探してください...]

== 複数のテストの自動実行

ADD命令以外の命令もテストしたいですが、わざわざコマンドを手打ちしたくありません。
本書では、自動でテストを実行し、その結果を報告するプログラムを作成します。

@<code>{test/test.py}を作成し、次のように記述します(@<list>{test.py})。

//list[test.py][test.py]{
#@mapfile(scripts/04b/create-test-py/core/test/test.py)
import argparse
import os
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("sim_path", help="path to simlator")
parser.add_argument("dir", help="directory includes test")
parser.add_argument("files", nargs='*', help="test hex file names")
parser.add_argument("-r", "--recursive", action='store_true', help="search file recursively")
parser.add_argument("-e", "--extension", default="hex", help="test file extension")
parser.add_argument("-o", "--output_dir", default="results", help="result output directory")
parser.add_argument("-t", "--time_limit", type=float, default=10, help="limit of execution time. set 0 to nolimit")
args = parser.parse_args()

# run test
def test(file_name):
    result_file_path = os.path.join(args.output_dir, file_name.replace(os.sep, "_") + ".txt")
    cmd = args.sim_path + " " + file_name + " 0"
    success = False
    with open(result_file_path, "w") as f:
        no = f.fileno()
        p = subprocess.Popen("exec " + cmd, shell=True, stdout=no, stderr=no)
        try:
            p.wait(None if args.time_limit == 0 else args.time_limit)
            success = p.returncode == 0
        except: pass
        finally:
            p.terminate()
            p.kill()
    print(("PASS" if success else "FAIL") + " : "+ file_name)
    return (file_name, success)

# search files
def dir_walk(dir):
    for entry in os.scandir(dir):
        if entry.is_dir():
            if args.recursive:
                for e in dir_walk(entry.path):
                    yield e
            continue
        if entry.is_file():
            if not entry.name.endswith(args.extension):
                continue
            if len(args.files) == 0:
                yield entry.path
            for f in args.files:
                if entry.name.find(f) != -1:
                    yield entry.path
                    break

if __name__ == '__main__':
    os.makedirs(args.output_dir, exist_ok=True)

    res_strs = []
    res_statuses = []

    for hexpath in dir_walk(args.dir):
        f, s = test(os.path.abspath(hexpath))
        res_strs.append(("PASS" if s else "FAIL") + " : " + f)
        res_statuses.append(s)

    res_strs = sorted(res_strs)
    statusText = "Test Result : " + str(sum(res_statuses)) + " / " + str(len(res_statuses))

    with open(os.path.join(args.output_dir, "result.txt"), "w", encoding='utf-8') as f:
        f.write(statusText + "\n")
        f.write("\n".join(res_strs))

    print(statusText)

    if sum(res_statuses) != len(res_statuses):
        exit(1)
#@end
//}

このPythonプログラムは、
第2引数で指定したディレクトリに存在する、
第3引数で指定した文字列を名前に含むファイルを、
第1引数で指定したシミュレータで実行し、
その結果を報告します。

このPythonプログラムには、次のオプションの引数が存在します。

 : -r
    第2引数で指定されたディレクトリの中にあるディレクトリも走査するようにします。
    デフォルトでは走査しません。

 : -e 拡張子
    指定した拡張子のファイルのみを対象にテストします。
    HEXファイルをテストしたい場合は、@<code>{-e hex}にします。
    デフォルトでは@<code>{hex}が指定されています。

 : -o ディレクトリ
    指定したディレクトリにテスト結果を格納します。
    デフォルトでは@<code>{result}ディレクトリに格納します。

 : -t 時間
    テストに時間制限を設けます。
    0を指定すると時間制限はなくなります。
    デフォルト値は10(秒)です。

それでは、RV32Iのテストを実行しましょう。
今回はRV32Iのテストを実行したいので、
riscv-testsのRV32I向けのテストの接頭辞であるrv32ui-p-引数に指定します。

//terminal[python.test.py][rv32ui-pから始まるテストを実行する]{
$ @<userinput>{python3 test/test.py obj_dir/sim test/share rv32ui-p- -r}
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lh.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sb.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sltiu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sh.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bltu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-or.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sra.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-xor.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-addi.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srai.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-auipc.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-slli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-slti.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lb.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bge.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sub.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-xori.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-beq.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-fence_i.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-jal.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-and.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lui.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bgeu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-slt.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sll.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-jalr.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-add.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-simple.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-andi.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv32ui-p-ma_data.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lhu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lbu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sltu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-ori.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-blt.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bne.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srl.bin.hex
Test Result : 39 / 40
//}

rv32ui-p-から始まる40個のテストの内、39個のテストにパスしました。
テストの詳細な結果はresultsディレクトリに格納されています。

rv32ui-p-ma_dataは、
ロードストアするサイズにアラインされていないアドレスへのロードストア命令のテストです。
これについては後の章で例外として対処するため、今は無視します。