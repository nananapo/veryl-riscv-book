= 環境構築

最低限必要なソフトウェアをインストールします。

次のいずれかの環境を用意してください。

 * WSLが使えるWindows
 * そこそこ新しめのMac
 * Linux

== Veryl

Verylは本書で利用するHDLです。
まず、Verylのコンパイラをインストールします。

=== Verylのインストール

まず、Verylをインストールします。
Verylには、Verylupというインストーラが用意されており、
これを利用することでverylをインストールすることができます。

Verylupはcargo, またはGitHubのReleaseページから入手することができます。
cargoが入っている方は@<code>{cargo install verylup}でインストールしてください。
cargoが入っていない場合は、以下のURLから入手方法を確認することができます。

 * veryl-lang/verylup : @<href>{https://github.com/veryl-lang/verylup}

Verylupを入手したら、次のようにVerylの最新版をインストールします。

//terminal[Verylup-install][Verylのインストール]{
$ @<userinput>{verylup setup}
[INFO ]  downloading toolchain: latest
[INFO ]   installing toolchain: latest
[INFO ]     creating hardlink: veryl
[INFO ]     creating hardlink: veryl-ls
//}

==== Verylの更新

verylはまだ開発途上の言語であり、頻繁にバージョンが更新されます。
最新のVerylに更新するには、次のようなコマンドを実行します。

//terminal[veryl-update][Verylの更新]{
$ @<userinput>{verylup update}
//}

==== インストールするバージョンの指定

特定のバージョンのVerylをインストールするには、次のようなコマンドを実行します。

//terminal[veryl-specific][Verylのバージョン0.13.0をインストールする]{
$ @<userinput>{verylup install 0.13.0}
//}

インストールされているバージョン一覧は次のように確認できます。

//terminal[veryl-show][インストール済みのVerylのバージョン一覧を表示する]{
$ @<userinput>{verylup show}
installed toolchains
--------------------
0.13.0
latest (default)
//}

==== 使用するバージョンの指定

バージョンを指定しない場合は、最新版のVerylが使用されます。

//terminal[veryl-version][verylのバージョン確認]{
$ @<userinput>{veryl --version}
veryl 0.13.0
//}

特定のバージョンのVerylを使用するには、次のようにverylコマンドを実行します。

//terminal[veryl-use-ver][Verylのバージョン0.13.0を使用する]{
$ @<userinput>{veryl +0.13.0} @<balloon>{+でバージョンを指定する}
//}

//caution[本書で利用するVerylのバージョン]{
本書ではバージョン0.13.0を利用しますが、
Veryl側の問題によりプログラムをビルドできないことがあります。
これの対処方法についてはサポートページを確認してください。

 * サポートページ : @<href>{TODO}
//}

=== VSCodeの拡張のインストール

エディタにVSCodeを利用している方は、@<img>{vscode-ext}の拡張をインストールすることをお勧めします。

 * URL : @<href>{https://marketplace.visualstudio.com/items?itemName=dalance.vscode-veryl}

//image[vscode-ext][VerylのVSCode拡張]

== Verilator

VerilatorはSystemVerilogのシミュレータを生成するためのソフトウェアです。

 * verilator/verilator : @<href>{https://github.com/verilator/verilator}

@<code>{apt}、または@<code>{brew}を利用してインストールすることができます。
パッケージマネージャが入っていない場合は、以下のページを参考にインストールしてください。

 * @<href>{https://verilator.org/guide/latest/install.html}

== riscv-gnu-toolchain

riscv-gnu-toolchainには、RISC-V向けのコンパイラなどのtoolchainが含まれています。

以下のリポジトリのREADMEにインストール方法が書かれています。
これの@<code>{Installation (Newlib)}を参考にインストールしてください。

 * riscv-collab/riscv-gnu-toolchain : @<href>{https://github.com/riscv-collab/riscv-gnu-toolchain}

//info[FPGAを利用する方へ]{
TangMega138Kを利用する人はGOWIN EDA,
PYNQ-Z1を利用する人はVivadoのインストールが必要です。
//}
