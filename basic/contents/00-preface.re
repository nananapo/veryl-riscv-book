= まえがき / はじめに

本書を手に取っていただき、ありがとうございます。

本書は、OSを実行できる程度の機能を持ったRISC-VのCPUを、新しめのハードウェア記述言語である@<b>{Veryl}で記述する方法について解説した本です。

====[notoc] 注意

本書は「Verylで作るCPU 基本編」の第I部のみを発行したものです。
そのため、本文に「後の章」と書かれていても、本書には含まれない場合があります。

本書のpdf, web版は無料で配布されており、
@<href>{https://github.com/nananapo/veryl-riscv-book}でダウンロード, 閲覧することができます。

====[notoc] 本書の対象読者

本書はコンピュータアーキテクチャに興味があり、
何らかのプログラミング言語を習得している人を対象としています。

====[notoc] 前提とする知識

次の要件を満たしていると良いです。

 * C, C++, C#, JavaScript, Python, Ruby Rustのような一般的なプログラミング言語をある程度使いこなすことができる
 * 論理演算を知っている

====[notoc] 問い合わせ先

本書に関する質問やお問い合わせは、以下のGitHubのリポジトリにissueを立てて行ってください。

 * @<href>{https://github.com/nananapo/veryl-riscv-book}

サポートページも用意しています。

 * @<w>{support-page}

====[notoc] 謝辞

本書はTODO氏とTODO氏にレビューしていただきました。
また、本書の一部はサイボウズ・ラボ株式会社のサイボウズ・ラボユースの支援を受けて執筆されたものです。
この場を借りて感謝します。

TODO issueの数でも書くか

//clearpage



==[notoc] Intro

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

====[notoc] CPUの自作

CPUって自作できるのでしょうか?
そもそもCPUの自作って何でしょうか?
CPUの自作について一般的な定義はありませんが、
筆者は
「命令セットアーキテクチャの設計」
「論理設計」
「物理的に製造する」
に分類できると考えています。

@<b>{命令セットアーキテクチャ}(Instruction Set Architecture, @<b>{ISA})とは、
CPUがどのような命令を実行することができるかを定めたもの(仕様)です。
ISAの設計は考えるだけなので、紙とペンさえあればできます。
@<b>{論理設計}とは、簡単に言うと、
仕様の動作を実現する論理回路を設計することです。
CPUは論理回路で構成されているため、CPUの設計には論理設計が必要になります。
最近のCPUは、物理的には
@<b>{VLSI}(Very Large Scale Integration, 超大規模集積回路)
によって実装されています。
VLSIの製造には莫大なお金が必要です@<fn>{vlsi}。

//footnote[vlsi][小さいチップなら安く(※安くない)製造することができます。efablessやTinyTapeout, OpenMPWで検索してください]

ISAの設計は簡単@<fn>{not-easy}なので、
CPUの自作を難しくしているのは、
論理設計と物理的な製造です。
論理設計については、最近では、
論理設計に使う言語やシミュレータ,
回路に落とし込むツールなどがオープンに公開されており、
昔よりは自作のハードルが下がっています@<fn>{not-know}。
物理的な製造のハードルは高いですが、
FPGAを使うことで簡単にお試しすることができます。
@<b>{FPGA}(Field Programmable Gate Array)とは、
任意の論理回路を実現できる集積回路のことです@<bib>{amano.fpga}。
最近は安価にFPGAを入手することができます。

//footnote[not-easy][簡単ではない。論理設計より難しいかもしれない]
//footnote[not-know][筆者は最近にCPUの自作を始めたので最近のことしか知りません。嘘だったらごめん]

本書は、ISAの設計は行わず、
論理設計は無料でオープンなツールを利用し、
安価(数千 ～ 数万円)なFPGAを利用してCPUを実装します。

CPUのテストはシミュレータとFPGAで行います。
本書では、TangMega 138KとPYNQ-Z1というFPGAを利用します。
ただし、実機がなくても実装を進めることができるので所有していなくても構いません。

====[notoc] RISC-V

@<b>{RISC-V}は、カリフォルニア大学バークレー校で開発されたISAです。
仕様書の初版は2011年に公開されました。
ISAとしての歴史はまだ浅いですが、
仕様がオープンでカスタマイズ可能であるという特徴もあって、
研究で利用されたり既に何種類もCPUが市販されているなど、
着実に広まっていっています。

インターネット上には多くのRISC-Vの実装が公開されています。
例として、
rocket-chip(Chiselによる実装),
Shakti(Bluespec SVによる実装),
rsd(SystemVerilogによる実装)が挙げられます。

本書では、RISC-Vのバージョン@<w>{riscv-version}を利用します。
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
これを、OSを実行できる程度までに進化させることを目標に実装を進めます。

====[notoc] 使用する言語

CPUの論理設計にはハードウェア記述言語を使用します。
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

====[notoc] 本書の構成

本シリーズ(基本編)では、次のようにCPUを実装していきます。

 1. RV32IのCPUを実装する (@<chap>{04-impl-rv32i})
 2. Zicsr拡張を実装する (@<chap>{04a-zicsr})
 3. CPUをテストする (@<chap>{04b-riscvtests})
 4. RV64Iを実装する (@<chap>{05-impl-rv64i})
 5. パイプライン処理化する (@<chap>{05a-pipeline})
 6. 実機でテストする (@<chap>{05b-synth})
 7. M, A, C拡張を実装する
 8. UARTと割り込みを実装する
 9. OSを実行するために必要なCSRを実装する
 10. OSを実行する

本書(基本編の第I部)では、上の1から4までを実装, 解説します。



//clearpage



==[notoc] 凡例

本書では、プログラムコードを次のように表示します。太字は強調を表します。

//list[][]{
print("Hello, @<b>|world|!\n");       @<balloon>{太字は強調}
//}

プログラムコードの差分を表示する場合は、追加されたコードを太字で、削除されたコードを取り消し線で表します。
ただし、リスト内のコードが全て新しく追加されるときは太字を利用しません。

//list[][]{
@<del>|print("Hello, @<b>|world|!\n");|       @<balloon>{取り消し線は削除したコード}
@<b>|print("Hello, "+name+"!\n");|    @<balloon>{太字は追加したコード}
//}

長い行が右端で折り返されると、折り返されたことを表す小さな記号がつきます。

//list[][]{
123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
//}

ターミナル画面は、次のように表示します。
行頭の「@<code>|$ |」はプロンプトを表し、ユーザが入力するコマンドには薄い下線を引いています。

//terminal{
$ @<userinput>|echo Hello|       @<balloon>{行頭の「$ 」はプロンプト、それ以降がユーザ入力}
//}

プログラムコードやターミナル画面は、@<code>{...}などの複数の点で省略を表すことがあります。

本文に対する補足情報や注意・警告は、次のようなノートや囲み枠で表示します。

//note[ノートタイトル]{
ノートは本文に対する補足情報です。
//}

//info[タイトル]{
本文に対する補足情報です。
//}

//caution[タイトル]{
本文に対する注意・警告です。
//}
