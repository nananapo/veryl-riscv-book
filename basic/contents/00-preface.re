= まえがき

@<large>{こんにちは! あなたはCPUを自作したことがありますか? 自作したことがあってもなくても大歓迎、この本はCPU自作の面白さを世に広めるために執筆されました。}

@<large>{パソコンの主要な部品であるCPUは、とても大きくて複雑な電子回路で構成されています。現代的で、高速で、ゲームができるようなCPUを作るのは非常に難しいですが、ちょっと遅くて機能が少ないCPUなら、誰でも簡単に作ることができます。}

@<large>{本書では、@<b>{Veryl}という「ハードウェアを記述するための言語」でCPUを自作する方法を解説しています。Verylを使うと、例えば32ビットの足し算をする回路を次のように記述できます。}

//list[][]{
module Adder (
    x  : input  logic<32>,
    y  : input  logic<32>,
    sum: output logic<32>,
) {
    always_comb {
        sum = x + y;
    }
}
//}

@<large>{@<code>{x}と@<code>{y}を受け取って、@<code>{sum}に@<code>{x + y}を割り当てるだけ....簡単ですね。これと同様に、入出力を書いて、足し算やAND、OR、NOT演算などを書くだけで、CPUを書くことができます。}

@<large>{CPUは大きな論理回路です。でも、Verylで書いた小さな部品を組み合わせていけば、簡単に実現することができます。}

@<large>{@<b>{あなたもCPUを自作してみませんか？}自分好みのCPUを作る第一歩を踏み出しましょう。}

==[notoc] 本書を読むとわかること

 * @<large>{CPUの仕組み、動作、実装}
 * @<large>{Verylの基本文法}
 * @<large>{VerylでのCPUの実装方法}
 * @<large>{RISC-Vの基本整数命令セット}

//clearpage

==[notoc] 対象読者

 * @<large>{@<b>{自作CPUに興味がある人}}
 * @<large>{コンピュータアーキテクチャに興味がある人}
 * @<large>{Verylが気になっている人}

==[notoc] 必要な知識

 * @<large>{基本的な論理演算 (AND、OR、NOTくらいしか使いません)}
 * @<large>{C、C++、JavaScript、Python、Ruby、Rustのような一般的なプログラミング言語の経験}

@<large>{本書では、Verylの他にC++, Python, Makefile, シェルスクリプトを使用します。Verylについては詳細を解説しています。他の言語については、動作とどのような機能を持つかは解説しますが、言語の仕様や書き方、ライブラリなどは説明しません。}

==[notoc] 本書のソースコード / 問い合わせ先

@<large>{本書で利用するソースコードは、以下のサポートページから入手することができます。質問やお問い合わせ方法についてもサポートページを確認してください。}

 * @<large>{@<w>{support-page}}

==[notoc] 注意

@<large>{本書は「Verylで作るCPU 基本編」の第I部のみを発行したものです。本文に「後の章」と書かれていても、本書には含まれない場合があります。完全版および電子版は無料で配布されており、@<href>{https://github.com/nananapo/veryl-riscv-book}で入手できます。}



//clearpage

==[notoc] CPUの自作

CPUって自作できるのでしょうか?
そもそもCPUの自作って何でしょうか?
CPUの自作の一般的な定義はありませんが、
筆者は
「命令セットアーキテクチャの設計」
「論理設計」
「物理的に製造する」
に分類できると考えています。

@<b>{命令セットアーキテクチャ}(Instruction Set Architecture, @<b>{ISA})とは、
CPUがどのような命令を実行できるかを定めたもの(仕様)です。
@<b>{論理設計}とは、簡単に言うと、
仕様の動作を実現する論理回路を設計することです。
CPUは論理回路で構成されているため、CPUの設計には論理設計が必要になります。
最近のCPUは、物理的には@<b>{VLSI}(Very Large Scale Integration, 超大規模集積回路)によって実装されています。
VLSIの製造には莫大なお金が必要です@<fn>{vlsi}。

//footnote[vlsi][小さいチップなら安く(数万 ～ 数百万円で)製造できます。OpenMPWやTinyTapeoutで検索してください]

ISAと実装(設計と製造)には深い関りがあるため、
ISAを知らずして実装はできないし、
実装を知らずしてISAを作ることはできません。
本書では、RISC-VというISAのCPUを実装することで、
一般的なCPUの作り方やアーキテクチャについて学びます。

物理的な製造のハードルは高いですが、
FPGAを使うことで簡単にお試しできます。
@<b>{FPGA}(Field Programmable Gate Array)とは、
任意の論理回路を実現できる集積回路のことです@<bib>{amano.fpga}。
最近では、安価(数千 ～ 数万円)でFPGAを入手できます。

CPUのテストはシミュレータとFPGAで行います。
本書では、TangMega 138KとPYNQ-Z1というFPGAを利用します。
FPGAを持っていると、
自作CPUによってLEDを制御したり、
手持ちのパソコンと直接通信したりして楽しむことができます。

==[notoc] RISC-V

@<b>{RISC-V}は、カリフォルニア大学バークレー校で開発されたISAです。
仕様書の初版は2011年に公開されました。
ISAとしての歴史はまだ浅いですが、
仕様が広く公開されていてカスタマイズ可能であるという特徴もあって、
#@# 研究で利用されたり既に何種類もCPUが市販されているなど、
着実に広がりつつあります。

インターネット上には多くのRISC-Vの実装が公開されています。
例として、
@<href>{https://github.com/chipsalliance/rocket-chip,RocketChip}(Chiselによる実装)、
@<href>{https://shakti.org.in/,Shakti}(Bluespec SystemVerilogによる実装)、
@<href>{https://github.com/rsd-devel/rsd,RSD}(SystemVerilogによる実装)が挙げられます。

本書では、RISC-Vのバージョン@<w>{riscv-version}を利用します。
RISC-Vの最新の仕様は、GitHubの
@<href>{https://github.com/riscv/riscv-isa-manual/, riscv/riscv-isa-manual}
で確認できます。

RISC-Vには、基本整数命令セットとしてRV32I、RV64I、RV32E、RV64E@<fn>{rv128i}が定義されています。
RVの後ろにつく数字はレジスタの長さ(XLEN)が何ビットかです。
基本整数命令セットには最低限の命令しか定義されていません。
それ以外のかけ算や割り算、不可分操作などの命令や機能は拡張として定義されています。

//footnote[rv128i][RV128Iもありますが、まだDraft段階(準備中)です]

どの拡張を実装しているかを示すISA Stringという表現では、
例えばかけ算と割り算、不可分操作ができるRV32IのCPUは@<code>{RV32IMA}と表現されます。
本書では、まず、@<code>{RV32I}のCPUを実装します。
これを、OSを実行できる程度までに進化させることを目標に実装を進めます。

==[notoc] 本書の構成

本シリーズ(基本編)では、次のようにCPUを実装していきます。

 1. RV32IのCPUを実装する (@<chap>{04-impl-rv32i})
 2. Zicsr拡張を実装する (@<chap>{04a-zicsr})
 3. CPUをテストする (@<chap>{04b-riscvtests})
 4. RV64Iを実装する (@<chap>{05-impl-rv64i})
 5. パイプライン化する (@<chap>{05a-pipeline})
 6. 実機でテストする (@<chap>{05b-synth})
 7. M拡張、A拡張、C拡張を実装する
 8. UARTと割り込みを実装する
 9. OSを実行するために必要なCSRを実装する
 10. OSを実行する

本書(基本編の第I部)では、上の1から6までを実装、解説します。



==[notoc] 凡例

プログラムコードの差分を表示する場合は、追加されたコードを太字で、削除されたコードを取り消し線で表します。
ただし、リスト内のコードが全て新しく追加されるときは太字を利用しません。
コードを置き換えるときは太字で示し、削除されたコードを示さない場合もあります。

//list[][]{
@<del>|print("Hello, @<b>|world|!\n");|       @<balloon>{取り消し線は削除したコード}
@<b>|print("Hello, "+name+"!\n");|    @<balloon>{太字は追加したコード}
//}

長い行が右端で折り返されると、折り返されたことを表す小さな記号がつきます。

//list[][]{
123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789__123456789_123456789_123456789_123456789_
//}

ターミナル画面は、次のように表示します。
行頭の「@<code>|$|」はプロンプトを表し、ユーザが入力するコマンドには下線を引いています。

//terminal{
$ @<userinput>{echo Hello}       @<balloon>{行頭の「$」はプロンプト、それ以降がユーザ入力}
//}

プログラムコードやターミナル画面は、@<code>{...}などの複数の点で省略することがあります。
