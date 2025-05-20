= U-modeの実装

本章ではRISC-Vで最も低い特権レベルであるUserモード(U-mode)を実装します。
U-modeはM-modeに管理されてアプリケーションを動かすための特権レベルであり、
M-modeで利用できていたほとんどのCSR、機能が制限されます。

本章で実装、変更する主な機能は次の通りです。
それぞれ解説しながら実装していきます。

 1. mstatusレジスタの一部のフィールド
 1. CSRのアクセス権限、MRET命令の実行権限の確認
 1. mcounterenレジスタ
 1. 割り込み条件、トラップの動作

== misa.Extensionsの変更

U-modeを実装しているかどうかはmisa.ExtensionsのUビットで確認できます。

misa.Extensionsの値を変更します
()。

//list[][]{
//}

== mstatusのUXL、TWビットの実装

U-modeのときのXLENはUXLENと定義されておりmstatus.UXLで確認できます。
仕様上はmstatus.UXLを書き換えでUXLENを変更できるように実装できますが、
本書ではUXLENが常に@<code>{64}になるように実装します。

mstatus.UXLを@<code>{64}を示す値である@<code>{2}に設定します
()。

//list[][]{
//}

mstatus.TWは、M-modeよりも低い特権レベルでWFI命令を実行するときに時間制限(Timeout Wait)を設けるためのビットです。
mstatus.TWが@<code>{0}のとき時間制限はありません。
@<code>{1}に設定されているとき、CPUの実装固有の時間だけ実行の再開を待ち、
時間制限を過ぎるとIllegal instruction例外を発生させます。

本書ではmstatus.TWが@<code>{1}のときに無限時間待てることにし、例外の実装を省略します。
mstatus.TWを書き換えられるようにします
()。

//list[][]{
//}

TODO make mstatus.TW readable -> writableだし、diffが入り込んでいる

== mstatus.MPPの実装

図TODO

M-mode、U-modeだけが存在する環境でトラップが発生するとき、
CPUはmstatusレジスタのMPPフィールドに現在の特権レベル(を示す値)を保存し、
特権レベルをM-modeに変更します。
また、MRET命令を実行するとmstatus.MPPの特権レベルに移動するようになります(図TODO)。

これにより、
トラップによるU(M)-modeからM-modeへの遷移(図TODO)、
MRET命令によるM-modeからU-modeへの遷移(図TODO)を実現できます。

MRET命令を実行するとmstatus.MPPは実装がサポートする最低の特権レベルに設定されます。

M-modeからU-modeに遷移したいとき、mstatus.MPPをU-modeの値に変更し、
U-modeで実行を開始したいアドレスをmepcレジスタに設定します
()。

//list[][]{
//}

mstatus.MPPに値を書き込めるようにします
()。

//list[][書き込みマスク]{
//}

MPPには@<code>{2'b00}(U-mode)と@<code>{2'b11}(M-mode)のみ設定できるようにします。
サポートしていない値を書き込もうとする場合は現在の値を維持します
()。

//list[][]{
//}

//list[][]{
//}

トラップが発生するとき、mstatus.MPPに現在の特権レベルを格納します
()。

//list[][]{
//}

トラップから戻るとき、特権レベルをmstatus.MPPに設定し、
mstatus.MPPに実装がサポートする最小の特権レベルである@<code>{2'b00}を書き込みます。

//list[][]{
//}

== CSRの読み書き権限の確認

TODO図

CSRのアドレスを@<code>{csr_addr}とするとき、
@<code>{csr_addr[9:8]}の2ビットはそのCSRにアクセスできる最低の権限レベルを表しています(TOOD図)。
これを下回る特権レベルでCSRにアクセスしようとするとIllegal instruction例外が発生します。

CSRのアドレスと特権レベルを確認して例外を起こすようにします
()。

//list[][]{
//}

//list[][]{
//}


=={impl-mcounteren} mcounterenレジスタの実装

TODO 図

mcounterenレジスタは、M-modeの次に低い特権レベルで
ハードウェアパフォーマンスモニタにアクセスできるようにするかを制御する32ビットのレジスタです(TODO 図)。
CY、TM、IRビットはそれぞれcycle、time、instretにアクセスできるかどうかを制御します@<fn>{hpmcounter}。

//footnote[hpmcounter][hpmcounterレジスタを制御するHPMビットもありますが、hpmcounterレジスタを実装していないので実装しません]

本章でM-modeの次に低い特権レベルとしてU-modeを実装するため、
mcounterenレジスタはU-modeでのアクセスを制御します。
U-modeでmcounterenレジスタで許可されていない状態でcycle、time、instretレジスタにアクセスしようとすると、
Illelgal Instruction例外が発生します。

mcounterenレジスタを作成し、CY、TM、IRビットに書き込みできるようにします
()。

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

mcounterenレジスタと特権レベルを確認し、例外を発生させます
()。

//list[][]{
//}

//list[][]{
//}

== MRET命令の実行を制限する

MRET命令はM-mode以上の特権レベルのときにしか実行できません。
M-mode未満の特権レベルでMRET命令を実行しようとするとIllegal instruction例外が発生します。

命令がMRET命令のとき、特権レベルを確認して例外を発生させます
()。

//list[][]{
//}

//list[][]{
//}

== ECALL命令のcauseを変更する

M-modeでECALL命令を実行するとEnvironment call from M-mode例外が発生します。
これに対してU-modeでECALL命令を実行するとEnvironment call from U-mode例外が発生します。
特権レベルと例外の対応は図TODOのようになっています。

図TODO cause

ここで各例外のcauseがU-modeのcauseに特権レベルの数値を足したものになっていることを利用します。
@<code>{CsrCause}型にEnvironment call from U-mode例外のcauseを追加します
()。

//list[][]{
//}

csrunitモジュールで、causeがEnvironment call from M-modeのとき
@<code>{mode}レジスタの値をcauseに足すようにします
()。

//list[][]{
//}

//list[][]{
//}

=={umode-int} 割り込み条件の変更

M-modeだけが実装されたCPUで割り込みが発生する条件は@<secref>{21-impl-interrupt|riscv-interrupts}で解説しましたが、
M-modeとU-modeだけが実装されたCPUで割り込みが発生する条件は少し異なります。
M-modeとU-modeだけが実装されたCPUで割り込みが発生する条件は次の通りです。

 1. 割り込み原因に対応したmipレジスタのビットが@<code>{1}である
 1. 割り込み原因に対応したmieレジスタのビットが@<code>{1}である
 1. 現在の特権レベルがM-mode未満である。またはmstatus.MIEが@<code>{1}である

M-modeだけの場合と違い、
現在の特権レベルがU-modeのときはグローバル割り込みイネーブルビット(mstatus.MIE)の値は考慮されずに割り込みが発生します。

現在の特権レベルによって割り込みが発生する条件を切り替えるようにします
()。

//list[][]{
//}