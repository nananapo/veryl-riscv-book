= 環境構築

本書で使用するソフトウェアをインストールします。

次のいずれかの環境を用意してください。
筆者はWindowsを利用しています。

 * WSLが使えるWindows
 * Mac
 * Linux

== Veryl

===[notoc] Verylのインストール

本書ではVerylという言語でCPUを記述します。
まず、Verylのトランスパイラをインストールします。
Verylには、Verylupというインストーラが用意されており、
これを利用することでVerylをインストールすることができます。

VerylupはGitHubのReleaseページから入手することができます。
@<href>{https://github.com/veryl-lang/verylup, veryl-lang/verylup}
で入手方法を確認してください@<fn>{cargo.install}。
Verylupを入手したら、
次のようにVerylの最新版をインストールします
(@<list>{Verylup-install})。

//footnote[cargo.install][cargoが入っている方は、@<code>{cargo install verylup}でもインストールできます。]


//terminal[Verylup-install][Verylのインストール]{
$ @<userinput>{verylup setup}
[INFO ]  downloading toolchain: latest
[INFO ]   installing toolchain: latest
[INFO ]     creating hardlink: veryl
[INFO ]     creating hardlink: veryl-ls
//}

==== Verylの更新

Verylはまだ開発途上の言語であり、頻繁にバージョンが更新されます。
最新のVerylに更新するには、次のようなコマンドを実行します
(@<list>{veryl-update})。

//terminal[veryl-update][Verylの更新]{
$ @<userinput>{verylup update}
//}

==== インストールするバージョンの指定

特定のバージョンのVerylをインストールするには、
次のようなコマンドを実行します
(@<list>{veryl-specific})。

#@# TODO wとuserinputを入れ子にできないのと、terminal内でwを使えない問題がある

//terminal[veryl-specific][Verylのバージョン0.13.1をインストールする]{
$ @<userinput>{verylup install 0.13.1}
//}

インストールされているバージョン一覧は次のように確認できます
(@<list>{veryl-show})。

//terminal[veryl-show][インストール済みのVerylのバージョン一覧を表示する]{
$ @<userinput>{verylup show}
installed toolchains
--------------------
0.13.1
0.13.2
latest (default)
//}

==== 使用するバージョンの指定

バージョンを指定しない場合は、
最新版のVerylが使用されます
(@<list>{veryl-version})。

//terminal[veryl-version][verylのバージョン確認]{
$ @<userinput>{veryl --version}
veryl 0.13.2
//}

特定のバージョンのVerylを使用するには、
次のようにverylコマンドを実行します
(@<list>{veryl-use-ver})。

//terminal[veryl-use-ver][Verylのバージョン0.13.2を使用する]{
$ @<userinput>|veryl +0.13.2| @<balloon>{+でバージョンを指定する}
//}

===[notoc] エディタの拡張のインストール

エディタにVimを利用している方は、
GitHubの@<href>{https://github.com/veryl-lang/veryl.vim, veryl-lang/veryl.vim}
でプラグインを入手することができます。

エディタにVSCodeを利用している方は、
@<img>{vscode-ext}の拡張をインストールするとシンタックスハイライトなどの機能を利用することができます。

 * @<href>{https://marketplace.visualstudio.com/items?itemName=dalance.vscode-veryl}

//image[vscode-ext][VerylのVSCode拡張][width=50%]

== Verilator

@<href>{https://github.com/verilator/verilator, Verilator}は、
SystemVerilogのシミュレータを生成するためのソフトウェアです。

aptやbrewを利用してインストールすることができます。
パッケージマネージャが入っていない場合は、
以下のページを参考にインストールしてください。

 * @<href>{https://verilator.org/guide/latest/install.html}

//caution[本書で利用するVerilatorのバージョン]{
本書ではバージョン5系を利用しますが、
Verilatorの問題によりシミュレータをビルドできない場合があります。
対処方法についてはサポートページを確認してください。

 * @<w>{support-page}
//}

== riscv-gnu-toolchain

riscv-gnu-toolchainは、RISC-V向けのコンパイラなどが含まれるtoolchainです。

GitHubの@<href>{https://github.com/riscv-collab/riscv-gnu-toolchain, riscv-collab/riscv-gnu-toolchain}
のREADMEにインストール方法が書かれています。
READMEの@<code>{Installation (Newlib)}を参考にインストールしてください。

#@# //info[FPGAを利用する方へ]{
#@# TangMega138Kを利用する人はGOWIN EDA、
#@# PYNQ-Z1を利用する人はVivadoのインストールが必要です。
#@# //}
