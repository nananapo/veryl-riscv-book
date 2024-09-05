= Introduction

こんにちは！あなたはCPUを作成したことがありますか？
作成したことがあってもなくても大歓迎、この本はCPU自作の面白さを世に広めるために執筆されました。
実装を始める前に、まずはRISC-Vや使用する言語、本書の構成について簡単に解説します。
RISC-VやVerylのことを知っているという方は、本書の構成だけ読んでいただければOKです。それでは始めましょう。

== RISC-V

RISC-Vはカリフォルニア大学バークレー校で開発されたRISCのISA(命令セットアーキテクチャ)です。
ISAとしての歴史はまだ浅く、仕様書の初版は2011年に公開されました。
それにも関わらず、RISC-Vは仕様がオープンでカスタマイズ可能であるという特徴もあって、
研究目的で利用されたり既に何種類もマイコンが市販されているなど、着実に広まっていっています。

インターネット上には多くのRISC-Vの実装が公開されています。
例として、rocket-chip(Chiselによる実装)、Shakti(Bluespec SVによる実装)、
rsd(SystemVerilogによる実装)が挙げられます。
これらを参考にして実装するのもいいと思います。

本書では、RISC-Vのバージョンriscv-isa-release-87edab7-2024-05-04を利用します。
RISC-Vの最新の仕様については、riscv/riscv-isa-manual (@<href>{https://github.com/riscv/riscv-isa-manual/}) で確認することができます。

RISC-Vには基本整数命令セットとしてRV32I, RV64I, RV32E, RV64Eが定義されています。
RVの後ろにつく数字はレジスタの長さ(XLEN)が何ビットかです。
数字の後ろにつく文字がIの場合、XLENビットのレジスタが32個存在します。
Eの場合はレジスタの数が16個になります。

基本整数命令セットには最低限の命令しか定義されていません。
その代わり、RISC-Vではかけ算や割り算, 不可分操作, CSRなどの追加の命令や機能が拡張として定義されています。
CPUが何を実装しているかを示す表現にISA Stringというものがあり、
例えばかけ算と割り算, 不可分操作ができるRV32IのCPUは@<code>{RV32IMA}と表現されます。

本書では@<code>{RV32I}の単純なCPUを@<code>{RV64IMACFD_Zicond_Zicsr_Zifencei}に進化させることを目標に実装を進めます。

=={section} 使用する言語

本書では、CPUの実装にVerylというハードウェア記述言語を使用します。
VerylはSystemVerilogの構文を書きやすくしたような言語で、
VerylのプログラムはSystemVerilogに変換することができます。
構文や機能はほとんどSystemVerilogと変わらないため、
SystemVerilogが分かる人は殆どノータイムでVerylを書けるようになると思います。
Verylの詳細については、@<secref>{03-veryl|section}で解説します。
なお、SystemVerilogの書き方については本書では解説しません。

他にはシミュレーションやテストのためにC++, Pythonを利用します。
プログラムがどのような意味かについては解説しますが、
SystemVerilogと同じように基本的な書き方については解説しません。

== 本書の構成

本書では、単純なRISC-Vのパイプライン処理のCPUを高速化, 高機能化するために実装を進めていきます。
まずOSを実行できる程度にCPUを高機能化したら、
高速にアプリケーションを実行できるようにCPUを高速化します。
そのため、本書は大きく分けて高機能化編と高速化編の2つで構成されています。

高機能化編では、CPUでxv6とLinuxを実行できるようにします。
OSを実行するために、かけ算, 不可分操作, 圧縮命令, 例外, 割り込み, ページングなどの機能を実装します(@<table>{book_kinou})。

//table[book_kinou][実装する機能 : 高機能化編]{
章			実装する機能
---------------------------------
あ			あ
あ			あ
あ			あ
あ			あ
あ			あ
あ			あ
//}

高速化編では、CPUに様々な高速化手法を取り入れます。
具体的には、分岐予測, TLB, キャッシュ, マルチコア化, アウトオブオーダー実行などです(@<table>{book_kousoku})。

//table[book_kousoku][実装する機能 : 高速化編]{
章			実装する機能
---------------------------------
あ			あ
あ			あ
あ			あ
あ			あ
あ			あ
あ			あ
あ			あ
あ			あ
//}

本書では、筆者が作成したパイプライン処理のRV32Iの参考実装(bluecore)に機能を追加し、
テストを記述し実行するという方法で解説を行っています。
テストはシミュレーションと実機(FPGA)で行います。
本書で使用しているFPGAは、Gowin社のTangMega 138Kというボードです。
これは3万円程度でAliExpressで購入することができます。
ただし、実機がなくても実装を進めることができるので所有していなくても構いません。

//image[tangmega138k][使用するFPGA(TangMega138K)][width=100%]