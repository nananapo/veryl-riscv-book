= Intro

こんにちは!
あなたはCPUを作成したことがありますか?
作成したことがあってもなくても大歓迎、
この本はCPU自作の面白さとVerylを世に広めるために執筆されました。
実装を始める前に、
まずはRISC-Vや使用する言語、
本書の構成について簡単に解説します。
RISC-VやVerylのことを知っているという方は、
本書の構成だけ読んでいただければOKです。
それでは始めましょう。

== CPUの自作

TODO

 * できるのか?できます
 * VLSIお高い
 * Efabless
 * OpenMPW, TinyTapeout
 * FPGA

CPUのテストはシミュレーションと実機(FPGA)で行います。
本書では、TangMega 138KとPYNQ-Z1というFPGAを利用します。
ただし、実機がなくても実装を進めることができるので所有していなくても構いません。

== RISC-V

RISC-Vは、カリフォルニア大学バークレー校で開発されたRISCのISA(命令セットアーキテクチャ)です。
仕様書の初版は2011年に公開されました。
ISAとしての歴史はまだ浅いですが、
RISC-Vは仕様がオープンでカスタマイズ可能であるという特徴もあって、
研究で利用されたり既に何種類もマイコンが市販されているなど、
着実に広まっていっています。

インターネット上には多くのRISC-Vの実装が公開されています。
例として、
rocket-chip(Chiselによる実装),
Shakti(Bluespec SVによる実装),
rsd(SystemVerilogによる実装)が挙げられます。

本書では、RISC-Vのバージョンriscv-isa-release-87edab7-2024-05-04 TODOを利用します。
RISC-Vの最新の仕様は、GitHubの
@<href>{https://github.com/riscv/riscv-isa-manual/, riscv/riscv-isa-manual}
で確認することができます。

RISC-Vには、基本整数命令セットとしてRV32I, RV64I, RV32E, RV64E@<fn>{rv128i}が定義されています。
RVの後ろにつく数字はレジスタの長さ(XLEN)が何ビットかです。
数字の後ろにつく文字がIの場合、XLENビットのレジスタが32個存在します。
Eの場合はレジスタの数が16個になります。

//footnote[rv128i][RV128Iもありますが、まだDraft段階です]

基本整数命令セットには最低限の命令しか定義されていません。
それ以外のかけ算や割り算, 不可分操作, CSRなどの追加の命令や機能は拡張として定義されています。
CPUが何を実装しているかを示す表現にISA Stringというものがあり、
例えばかけ算と割り算, 不可分操作ができるRV32IのCPUは@<code>{RV32IMA}と表現されます。

本書では、まず、@<code>{RV32I}のCPUを作成します。
これを@<code>{RV64IMACFD_Zicond_Zicsr_Zifencei}に進化させることを目標に実装を進めます。

== 使用する言語

ハードウェア記述言語とは、文字通り、
ハードウェアを記述するための言語です。
ハードウェアとは論理回路のことで、
ハードウェア記述言語を使うと論理回路を記述, 生成することができます。
これ以降、ハードウェア記述言語のことをHDL (Hardware Description Language) と書くことがあります。

有名なHDLとしてはVerilog HDL, SystemVerilog, VHDLが挙げられますが、
本書では、CPUの実装にVerylというHDLを使用します。
VerylはSystemVerilogの構文を書きやすくしたような言語で、
VerylのプログラムはSystemVerilogに変換することができます。
そのため、SystemVerilogを利用できる環境でVerylを使用することができます。

Verylの構文や機能はSystemVerilogと似通っており、
SystemVerilogが分かる人は殆ど時間をかけずにVerylを書けるようになると思います。
本書はSystemVerilogを知らない人を対象にしているため、
SystemVerilogを知っている必要はありません。
HDLやVerylの記法は@<chapref>{03-veryl}で解説します。

他には、回路のシミュレーションやテストのためにC++, Pythonを利用します。
プログラムがどのような意味や機能を持つかについては解説しますが、
言語の仕様や書き方、ライブラリなどについては説明しません。

== 本書の構成

本シリーズ(基本編)では、次のようにCPUを実装していきます。

 1. RV32IのCPUを実装する (@<chap>{04-impl-rv32i})
 2. Zicsr拡張を実装する (@<chap>{04a-zicsr})
 3. RV64Iを実装する (@<chap>{05-impl-rv64i})
 4. パイプライン化する (@<chap>{05a-pipeline})
 5. M, A, C拡張を実装する
 6. UARTと割り込みを実装する
 7. OSを実行するために必要なCSRを実装する
 8. OSを実行する

本書(基本編の第I部)では、上の1から4までを実装, 解説します。
