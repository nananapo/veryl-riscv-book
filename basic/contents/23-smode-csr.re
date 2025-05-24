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

eeiパッケージに、本書で実装するS-modeのCSRをすべて定義します。

//list[eei.veryl.addr.CsrAddr][ (eei.veryl)]{
#@maprange(scripts/23/addr-range/core/src/eei.veryl,CsrAddr)
    enum CsrAddr: logic<12> {
        // Supervisor Trap Setup
        SSTATUS = 12'h100,
        SIE = 12'h104,
        STVEC = 12'h105,
        SCOUNTEREN = 12'h106,
        // Supervisor Trap Handling
        SSCRATCH = 12'h140,
        SEPC = 12'h141,
        SCAUSE = 12'h142,
        STVAL = 12'h143,
        SIP = 12'h144,
#@end
//}

== misa.Extensions、mstatus.SXL、mstatus.MPPの実装

S-modeを実装しているかどうかはmisa.ExtensionsのSビットで確認できます。

misa.ExtensionsのSビットを@<code>{1}に設定します
()。

//list[csrunit.veryl.misamppsxl.misa][ (csrunit.veryl)]{
#@maprange(scripts/23/misamppsxl-range/core/src/csrunit.veryl,misa)
    let misa      : UIntX  = {2'd2, 1'b0 repeat XLEN - 28, 26'b0000010@<b>|1|000001000100000101}; // U, @<b>|S|, M, I, C, A
#@end
//}

S-modeのときのXLENはSXLENと定義されており、UXLENと同じようにmstatus.SXLで確認できます。
本書ではSXLENが常に@<code>{64}になるように実装します。

mstatus.SXLを@<code>{64}を示す値である@<code>{2}に設定します
()。

//list[eei.veryl.misamppsxl.sxl][ (eei.veryl)]{
#@maprange(scripts/23/misamppsxl-range/core/src/eei.veryl,sxl)
    const MSTATUS_UXL: UInt64 = 2 << 32;
    @<b>|const MSTATUS_SXL: UInt64 = 2 << 34;|
#@end
//}

//list[csrunit.veryl.misamppsxl.reset][ (csrunit.veryl)]{
#@maprange(scripts/23/misamppsxl-range/core/src/csrunit.veryl,reset)
    always_ff {
        if_reset {
            mode       = PrivMode::M;
            mstatus    = MSTATUS_SXL @<b>{| MSTATUS_UXL};
#@end
//}

今のところmstatus.MPPにはM-modeとU-modeを示す値しか書き込めないようにしているため、
これをS-modeの値(@<code>{2'b10})も書き込めるように変更します
()。
これにより、MRET命令でS-modeに移動できるようになります。

//list[csrunit.veryl.misamppsxl.mstatus][ (csrunit.veryl)]{
#@maprange(scripts/23/misamppsxl-range/core/src/csrunit.veryl,mstatus)
    function validate_mstatus (
        mstatus: input UIntX,
        wdata  : input UIntX,
    ) -> UIntX {
        var result: UIntX;
        result = wdata;
        // MPP
        if @<b>|wdata[12:11] == 2'b10| {
            result[12:11] = mstatus[12:11];
        }
        return result;
    }
#@end
//}

== scounterenレジスタの実装

@<secref>{22-umode-csr|impl-mcounteren}ではmcounterenレジスタによって
ハードウェアパフォーマンスモニタにU-modeでアクセスできるようにしました。
S-modeを導入するとmcounterenレジスタは
S-modeがハードウェアパフォーマンスモニタにアクセスできるようにするかを制御するレジスタに変わります。
また、mcounterenレジスタの代わりに
U-modeでハードウェアパフォーマンスモニタにアクセスできるようにするかを制御する32ビットのscounterenレジスタが追加されます。

scounterenレジスタのフィールドのビット配置はmcounterenレジスタと等しいです。
また、U-modeでハードウェアパフォーマンスにアクセスできる条件は、
mcounterenレジスタとscounterenレジスタの両方によって許可されている場合になります。

scounterenレジスタを作成し、読み書きできるようにします
()。

//list[csrunit.veryl.scounteren.reg][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,reg)
    var scounteren: UInt32;
#@end
//}

//list[csrunit.veryl.scounteren.reset][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,reset)
    mtval      = 0;
    @<b>|scounteren = 0;|
    led        = 0;
#@end
//}

//list[csrunit.veryl.scounteren.rdata][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MTVAL     : mtval,
    @<b>|CsrAddr::SCOUNTEREN: {1'b0 repeat XLEN - 32, scounteren},|
    CsrAddr::LED       : led,
#@end
//}

//list[csrunit.veryl.scounteren.WMASK][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,WMASK)
    const SCOUNTEREN_WMASK: UIntX = 'h0000_0000_0000_0007 as UIntX;
#@end
//}

//list[csrunit.veryl.scounteren.wmask][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,wmask)
    CsrAddr::MTVAL     : MTVAL_WMASK,
    @<b>|CsrAddr::SCOUNTEREN: SCOUNTEREN_WMASK,|
    CsrAddr::LED       : LED_WMASK,
#@end
//}

//list[csrunit.veryl.scounteren.write][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,write)
    CsrAddr::MTVAL     : mtval      = wdata;
    @<b>|CsrAddr::SCOUNTEREN: scounteren = wdata[31:0];|
    CsrAddr::LED       : led        = wdata;
#@end
//}

ハードウェアパフォーマンスモニタにアクセスするときに許可を確認する仕組みを実装します
()。
S-modeでアクセスするときはmcounterenレジスタだけ確認し、
U-modeでアクセスするときはmcounterenレジスタとscounterenレジスタを確認します。

//list[csrunit.veryl.scounteren.priv][ (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,priv)
    let expt_zicntr_priv       : logic = is_wsc && @<b>|(|mode @<b>{<=} PrivMode::S && case csr_addr {
        CsrAddr::CYCLE  : !mcounteren[0],
        CsrAddr::TIME   : !mcounteren[1],
        CsrAddr::INSTRET: !mcounteren[2],
        default         : 0,
    } @<b>{|| mode <= PrivMode::U && case csr_addr} @<b>|{|
        @<b>|CsrAddr::CYCLE  : !scounteren[0],|
        @<b>|CsrAddr::TIME   : !scounteren[1],|
        @<b>|CsrAddr::INSTRET: !scounteren[2],|
        @<b>|default         : 0,|
    @<b>|})|; // attempt to access Zicntr CSR without permission
#@end
//}

== sstatusレジスタの実装

TODO 図

sstatusレジスタはmstatusレジスタの一部をS-modeで読み込み、書き込みできるようにしたSXLENビットのレジスタです。
本章ではmstatusレジスタに読み込み、書き込みマスクを適用することでsstatusレジスタを実装します。

sstatusレジスタの書き込みマスクを定義します
()。

//list[csrunit.veryl.sstatus.WMASK][ (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,WMASK)
    const SSTATUS_WMASK   : UIntX = 'h0000_0000_0000_0000 as UIntX;
#@end
//}

//list[csrunit.veryl.sstatus.wmask][ (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,wmask)
    CsrAddr::MTVAL     : MTVAL_WMASK,
    @<b>|CsrAddr::SSTATUS   : SSTATUS_WMASK,|
    CsrAddr::SCOUNTEREN: SCOUNTEREN_WMASK,
#@end
//}

読み込みマスクを定義し、mstatusレジスタにマスクを適用した値をsstatusレジスタの値にします
()。

//list[csrunit.veryl.sstatus.RMASK][ (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,RMASK)
    const SSTATUS_RMASK: UIntX = 'h8000_0003_018f_e762;
#@end
//}

//list[csrunit.veryl.sstatus.reg][ (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,reg)
    let sstatus   : UIntX  = mstatus & SSTATUS_RMASK;
#@end
//}

//list[csrunit.veryl.sstatus.rdata][ (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MTVAL     : mtval,
    @<b>|CsrAddr::SSTATUS   : sstatus,|
    CsrAddr::SCOUNTEREN: {1'b0 repeat XLEN - 32, scounteren},
#@end
//}

マスクを適用した書き込みを実装します
()。
書き込みマスクが適用されたwdataと、
書き込みマスクをビット反転した値でマスクされたmstatusレジスタの値のORを書き込みます。

//list[csrunit.veryl.sstatus.write][ (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,write)
    CsrAddr::SSTATUS   : mstatus    = validate_mstatus(mstatus, wdata | mstatus & ~SSTATUS_WMASK);
#@end
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

=== トラップに関連するレジスタを作成する

S-modeに委譲されたトラップで使用するレジスタを作成します。
stvec、sscratch、sepc、scause、stvalレジスタを作成します
()。


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

=== SRET命令を実装する

==== SRET命令の実装

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


==== mstatus.TSRの実装

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

=== mip、mieレジスタを変更する

S-modeを導入すると、
mip、mieレジスタのS-modeの外部割り込み(Supervisor external interrupt)、
ソフトウェア割り込み(Supervisor software interrupt)、
タイマ割り込み(Supervisor timer interrupt)のビットを変更できるようになります。

mipレジスタのSEIP、SSIE、STIEビット、
mieレジスタのSEIP、SSIP、STIPビットを変更できるようにします
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
