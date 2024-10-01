= 環境構築

TODO

WSLかMac, Linuxを前提とする

== Veryl

rustup
cargo
vscodeの拡張

Verylには、verylupというtoolchainが用意されており、これを利用することでverylをインストールすることができます。

//terminal[verylup-install][verylupのインストール]{
$ @<userinput>{cargo install verylup} @<balloon>{verylupのインストール}
$ @<userinput>{verylup setup} @<balloon>{verylupのセットアップ}
[INFO ]  downloading toolchain: latest
[INFO ]   installing toolchain: latest
[INFO ]     creating hardlink: veryl
[INFO ]     creating hardlink: veryl-ls
//}

//terminal[veryl-version][verylがインストールされているかの確認]{
$ @<userinput>{veryl --version}
veryl 0.13.0
//}

== Verilator

インストールするだけ

== riscv-gnu-toolchain

インストールするだけ