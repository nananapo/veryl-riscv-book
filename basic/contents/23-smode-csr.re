= S-modeの実装 (1. CSRの実装)

本章ではSupervisortモード(S-mode)を実装します。
S-modeは主にOSのようなシステムアプリケーションを動かすために使用される特権レベルです。
S-modeがある環境には必ずU-modeが実装されています。

S-modeを導入することで変わる主要な機能はトラップです。
M-mode、U-modeだけの環境ではトラップで特権レベルをM-modeに変更していましたが、
M-modeではなくS-modeに遷移するように変更できるようになります。
これに伴い、トラップ関連のCSR(stvec、sepc、scause、stvalなど)が追加されます。

S-modeで新しく導入される大きな機能として仮想記憶システムがあります。
仮想記憶システムはページングを使って仮想的なアドレスを使用できるようにする仕組みです。
これについては@<chapref>{24-impl-paging}で解説します。

他にはscounterenレジスタ、トラップから戻るためのSRET命令などが追加されます。
また、Supervisor software interruptを提供するSSWIデバイスも実装します。
それぞれ解説しながら実装していきます。

== CSRのアドレスの追加

本書で実装するS-modeのCSRをすべて定義します。

//list[][]{
//}

== misa.Extensionsの変更

S-modeを実装しているかどうかはmisa.ExtensionsのSビットで確認できます。

misa.Extensionsの値を変更します
()。

//list[][]{
//}

== mstatusのSXL、MPPビットの実装

S-modeのときのXLENはSXLENと定義されており、UXLENと同じようにmstatus.SXLで確認できます。
本書ではSXLENが常に@<code>{64}になるように実装します。

mstatus.SXLを@<code>{64}を示す値である@<code>{2}に設定します
()。

//list[][]{
//}

mstatus.MPPにM-modeとU-modeを示す値しか書き込めないようになっています。
これをS-modeの値(@<code>{2'b10})も書き込めるように変更します
()。
これにより、MRET命令でS-modeに移動できるようになります。

//list[][]{
//}

== scounterenレジスタの実装

@<secref>{22-umode-csr|impl-mcounteren}ではmcounterenレジスタによって
ハードウェアパフォーマンスモニタにU-modeでアクセスできるようにしました。
S-modeを導入するとmcounternレジスタは
S-modeがハードウェアパフォーマンスモニタにアクセスできるようにするかを制御するレジスタに変わります。
また、mcounterenレジスタの代わりに
U-modeでハードウェアパフォーマンスモニタにアクセスできるようにするかを制御する32ビットのscounterenレジスタが追加されます。

scounternレジスタのフィールドのビット配置はmcounternレジスタと等しいです。
また、U-modeでハードウェアパフォーマンスにアクセスできる条件は、
mcounterenレジスタとscounterenレジスタの両方によって許可されている場合になります。

scounterenレジスタを作成し、読み書きできるようにします
()。

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

ハードウェアパフォーマンスモニタにアクセスするときの許可確認ロジックを変更します
()。

//list[][]{
//}

== sstatusレジスタの実装

TODO 図

sstatusレジスタはmstatusレジスタの一部をS-modeで読み込み、書き込みできるようにしたSXLENビットのレジスタです。
本章ではmstatusレジスタに読み込み、書き込みマスクを適用することでsstatusレジスタを実装します。

sstatusレジスタの読み込み、書き込みマスクを定義します
()。

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

マスクを適用した読み込み、書き込みを実装します
()。
書き込みマスクでマスクされたwdataと、書き込みマスクをビット反転した値でマスクされたmstatusレジスタの和(OR)を書き込みデータとします。

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

=={delegating-trap} トラップの委譲

=== トラップの委譲

S-modeが実装されているとき、
S-modeとU-modeで発生する割り込みと例外のトラップ先の特権レベルをM-modeからS-modeに委譲することができます。
現在の特権レベルがM-modeのときに発生したトラップの特権レベルの遷移先をS-modeに変更することはできません。

M-modeからS-modeに委譲されたトラップは、mtvecではなくstvecにプログラムカウンタを移動します。
また、
mepcではなくsepcにトラップが発生した命令アドレスを格納し、
scauseにトラップの原因を示す値、
stvalに例外に固有の情報、
sstatus.SPPにトラップ前の特権レベル、
sstatus.SPIEにsstatus.SIE、
sstatus.SIEに@<code>{0}を格納します。
これ以降、トラップでx-modeに遷移するときに変更、参照するCSRを例えば
xtvec、xepc、xcause、xtval、mstatus.xPPのように頭文字をxにして呼ぶことがあります。

==== 例外の委譲

図TODO

medelegレジスタは、どの例外を委譲するかを制御する64ビットのレジスタです(図TODO)。
medelegレジスタの下からi番目のビットが立っているとき、S-mode、U-modeで発生したcauseがiの例外をS-modeに委譲します。
M-modeで発生した例外はS-modeに委譲されません。

Environment call from M-mode例外のように委譲することができない命令のmedelegレジスタのビットは@<code>{1}に変更できません。

==== 割り込みの委譲

図TODO

midelegレジスタは、どの割り込みを委譲するかを制御するMXLENビットのレジスタです(図TODO)。
各割り込みはmie、mipレジスタと同じ場所のmidelegレジスタのビットによって委譲されるかどうかが制御されます。

M-mode、S-mode、U-modeが実装されたCPUで、割り込みでM-modeに遷移する条件は次の通りです。

 1. 割り込み原因に対応したmipレジスタのビットが@<code>{1}である
 1. 割り込み原因に対応したmieレジスタのビットが@<code>{1}である
 1. 現在の特権レベルがM-mode未満である。またはmstatus.MIEが@<code>{1}である
 1. 割り込み原因に対応したmidelegレジスタのビットが@<code>{0}である

割り込みがでS-modeに遷移する条件は次の通りです。

 1. 割り込み原因に対応したsipレジスタのビットが@<code>{1}である
 1. 割り込み原因に対応したsieレジスタのビットが@<code>{1}である
 1. 現在の特権レベルがS-mode未満である。またはS-modeのとき、sstatus.SIEが@<code>{1}である

sip、sieレジスタは、それぞれmip、mieレジスタの委譲された割り込みのビットだけ読み込み、書き込みできるようにしたレジスタです。
委譲されていない割り込みに対応したビットは読み込み専用の@<code>{0}になります。
委譲された割り込みは現在の特権レベルがM-modeのときは発生しません。

S-modeに委譲された割り込みは外部割り込み、ソフトウェア割り込み、タイマ割り込みの順に優先されます。
同時に委譲されていない割り込みを発生させられるとき、委譲されていない割り込みを優先します。

本書ではM-modeの外部割り込み(Machine external interrupt)、
ソフトウェア割り込み(Machine software interrupt)、
タイマ割り込み(Machine timer interrupt)はS-modeに委譲できないように実装します@<fn>{mideleg-no}。

//footnote[mideleg-no][多くの実装ではこれらの割り込みを委譲できないように実装するようです。そのため、本書で実装するコアでも委譲できないように実装します。]

TODO 無駄な論理 (mode <= PrivMode::S && (mode != PrivMode::S || mstatus_sie)) -> (mode <= PrivMode::S || mstatus_sie)

=== トラップに関連するCSRを作成する

S-modeに委譲されたトラップで使用するレジスタを作成します。
stvec、sscratch、sepc、scause、stvalレジスタを作成します
()。

//list[][]{
//}

=== mstatusのSIE、SPIE、SPPビットを実装する

mstatusレジスタのSIE、SPIE、SPPビットを実装します。
mstatus.SIEはS-modeに委譲された割り込みのグローバル割り込みイネーブルビットです。
mstatus.SPIEはS-modeに委譲されたトラップが発生するときにmstatus.SIEを退避するビットです。
mstatus.SPPはS-modeに委譲されたトラップが発生するときに、トラップ前の特権レベルを書き込むビットです。
S-modeに委譲されたトラップはS-modeかU-modeでしか発生しないため、
mstatus.SPPはそれを区別するために必要な1ビット幅のフィールドになっています。

mstatusのSIE、SPIE、SPPビットを書き込みできるようにします
()。
sstatusでも読み込み、書き込みできるようにします。

//list[][]{
//}

=== SRET命令の実装

SRET命令は、S-modeのCSR(sepc、sstatusなど)を利用してトラップ処理から戻るための命令です。
SRET命令はS-mode以上の特権レベルのときにしか実行できません。

SRET命令を判定し、SRET命令を実行するときはMRETで参照、変更していたCSRをS-modeのレジスタに置き換えた処理を実行するように実装します
()。

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

SRET命令がS-mode未満の特権レベルで実行されたときに例外が発生するようにします
()。

//list[][]{
//}

=== mip、mieレジスタを変更する

S-modeを導入すると、
S-modeのmip、mieレジスタの外部割り込み(Supervisor external interrupt)、
ソフトウェア割り込み(Supervisor software interrupt)、
タイマ割り込み(Supervisor timer interrupt)用のビットを変更できるようになります。

mipレジスタのSEIP、SSIE、STIEビット、mieレジスタのSEIP、SSIP、STIPビットを変更できるようにします
()。

//list[][]{
//}

//list[][]{
//}

=== medeleg、midelegレジスタを作成する

medeleg、midelegレジスタを作成します。
それぞれ委譲できる例外、割り込みに対応するビットだけ書き換えられるようにします
()。

//list[][]{
//}

//list[][]{
//}

=== sie、sipレジスタを実装する

sie、sipレジスタを作成します。
どちらもmidelegレジスタで委譲されているときだけ値を参照できるように、
sieレジスタはmidelegレジスタで委譲された割り込みに対応するビットだけ書き換えられるようにします
()。

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

//list[][]{
//}

=== 割り込み条件、トラップの動作を変更する

作成したCSRを利用して、割り込みが発生する条件、トラップが発生したときのCSRの操作を変更します。

例外が発生するとき、遷移先の特権レベル、利用するレジスタを変更します
()。

//list[][]{
//}

割り込みの発生条件と参照するCSRを、遷移先の特権レベルごとに用意します
()。

//list[][]{
//}

//list[][]{
//}

M-mode向けの割り込みを優先して利用します
()。

//list[][]{
//}

これらの変数を利用して、CSRの操作を変更します。

//list[][]{
//}

//list[][]{
//}

== mstatus.TSRの実装

mstatusレジスタのTSR(Trap SRET)ビットは、
SRET命令をS-modeで実行したときに例外を発生させるかを制御するビットです。
@<code>{1}のときにIllegal instruction例外が発生するようになります。

mstatus.TSRを変更できるようにします
()。

//list[][]{
//}

例外を判定します
()。

//list[][]{
//}

//list[][]{
//}

=={impl-sswi} ソフトウェア割り込みの実装 (SSWI)

SSWIデバイスはソフトウェア割り込み(supervisor software insterrupt)を提供するためのデバイスです。
SSWIデバイスにはハードウェアスレッド毎に4バイトのSETSSIPレジスタが用意されています(TODO テーブル)
SETSSIPレジスタを読み込むと常に@<code>{0}を返しますが、
最下位ビットに@<code>{1}を書き込むとそれに対応するハードウェアスレッドのmip.SSIPビットが@<code>{1}になります。

TODOテーブル4095個

今のところmhartidが@<code>{0}のハードウェアスレッドしか存在しないため、SETSSIP0のみ実装します。
aclint_ifインターフェースに、
mipレジスタのSSIPビットを@<code>{1}にする要求のための@<code>{setssip}を作成します
()。

//list[][]{
//}

aclintモジュールでSETSSIP0への書き込みを検知し、最下位ビットを@<code>{setssip}に接続します。

//list[][]{
//}

//list[][]{
//}

csrunitモジュールで@<code>{setssip}を確認し、mip.SSIPを立てるようにします
()。
同時にmipレジスタにZicsrの命令があるとき、mip.SSIPへの@<code>{1}の書き込みを優先します。

//list[][]{
//}
