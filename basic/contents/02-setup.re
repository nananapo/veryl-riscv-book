= 環境構築

本書で使用するソフトウェアをインストールします。

次のいずれかの環境を用意してください。
筆者はWindowsを推奨します。

 * WSLが使えるWindows
 * Mac
 * Linux

== Veryl

===[notoc] Verylのインストール

Verylは本書で利用するHDLです。
まず、Verylのトランスパイラをインストールします。
Verylには、Verylupというインストーラが用意されており、
これを利用することでverylをインストールすることができます。

Verylupはcargo, またはGitHubのReleaseページから入手することができます。
cargoが入っている方は@<code>{cargo install verylup}でインストールしてください。
cargoが入っていない場合は、
@<href>{https://github.com/veryl-lang/verylup, veryl-lang/verylup}
から入手方法を確認することができます。

Verylupを入手したら、
次のようにVerylの最新版をインストールします
(@<list>{Verylup-install})。

//terminal[Verylup-install][Verylのインストール]{
$ @<userinput>{verylup setup}
[INFO ]  downloading toolchain: latest
[INFO ]   installing toolchain: latest
[INFO ]     creating hardlink: veryl
[INFO ]     creating hardlink: veryl-ls
//}

==== Verylの更新

verylはまだ開発途上の言語であり、頻繁にバージョンが更新されます。
最新のVerylに更新するには、次のようなコマンドを実行します
(@<list>{veryl-update})。

//terminal[veryl-update][Verylの更新]{
$ @<userinput>{verylup update}
//}

==== インストールするバージョンの指定

特定のバージョンのVerylをインストールするには、
次のようなコマンドを実行します
(@<list>{veryl-specific})。

//terminal[veryl-specific][Verylのバージョン@<w>{veryl-version}をインストールする]{
$ verylup install 0.13.1
//}

インストールされているバージョン一覧は次のように確認できます
(@<list>{veryl-show})。

//terminal[veryl-show][インストール済みのVerylのバージョン一覧を表示する]{
$ @<userinput>{verylup show}
installed toolchains
--------------------
0.13.1
latest (default)
//}

==== 使用するバージョンの指定

バージョンを指定しない場合は、
最新版のVerylが使用されます
(@<list>{veryl-version})。

//terminal[veryl-version][verylのバージョン確認]{
$ @<userinput>{veryl --version}
veryl 0.13.1
//}

特定のバージョンのVerylを使用するには、
次のようにverylコマンドを実行します
(@<list>{veryl-use-ver})。

//terminal[veryl-use-ver][Verylのバージョン@<w>{veryl-version}を使用する]{
$ @<userinput>{veryl +0.13.1} @<balloon>{+でバージョンを指定する}
//}

//caution[本書で利用するVerylのバージョン]{
本書ではバージョン@<w>{veryl-version}を利用しますが、
Veryl側の問題によりプログラムをビルドできないことがあります。
これの対処方法についてはサポートページを確認してください。

 * @<w>{support-page}
//}

===[notoc] VSCodeの拡張のインストール

エディタにVSCodeを利用している方は、
@<img>{vscode-ext}の拡張をインストールするとシンタックスハイライト等の機能を利用することができます。

 * @<href>{https://marketplace.visualstudio.com/items?itemName=dalance.vscode-veryl}

//image[vscode-ext][VerylのVSCode拡張]

== Verilator

@<href>{https://github.com/verilator/verilator, Verilator}は、
SystemVerilogのシミュレータを生成するためのソフトウェアです。

@<code>{apt}、または@<code>{brew}を利用してインストールすることができます。
パッケージマネージャが入っていない場合は、以下のページを参考にインストールしてください。

 * @<href>{https://verilator.org/guide/latest/install.html}

== riscv-gnu-toolchain

riscv-gnu-toolchainは、RISC-V向けのコンパイラなどが含まれるtoolchainです。

@<href>{https://github.com/riscv-collab/riscv-gnu-toolchain, riscv-collab/riscv-gnu-toolchain}
のREADMEにインストール方法が書かれています。
READMEの@<code>{Installation (Newlib)}を参考にインストールしてください。

//info[FPGAを利用する方へ]{
TangMega138Kを利用する人はGOWIN EDA,
PYNQ-Z1を利用する人はVivadoのインストールが必要です。
//}
