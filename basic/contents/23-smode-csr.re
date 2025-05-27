= S-modeの実装 (1. CSRの実装)

本章ではSupervisortモード(S-mode)を実装します。
S-modeは主にOSのようなシステムアプリケーションを動かすために使用される特権レベルです。
S-modeがある環境には必ずU-modeが実装されています。

S-modeを導入することで変わる主要な機能はトラップです。
M-mode、U-modeだけの環境ではトラップで特権レベルをM-modeに変更していましたが、
M-modeではなくS-modeに遷移できるようになります。
これに伴い、トラップ関連のCSR(stvec、sepc、scause、stvalなど)が追加されます。

S-modeで新しく導入される大きな機能として仮想記憶システムがあります。
仮想記憶システムはページングを使って仮想的なアドレスを使用できるようにする仕組みです。
これについては@<chapref>{24-impl-paging}で解説します。

他にはscounterenレジスタ、トラップから戻るためのSRET命令などが追加されます。
また、Supervisor software interruptを提供するSSWIデバイスも実装します。
それぞれ解説しながら実装します。

eeiパッケージに、本書で実装するS-modeのCSRをすべて定義します。

//list[eei.veryl.addr.CsrAddr][CSRのアドレスを定義する (eei.veryl)]{
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
        // Supervisor Protection and Translation
        SATP = 12'h180,
#@end
//}

== misa.Extensions、mstatus.SXL、mstatus.MPPの実装

S-modeを実装しているかどうかはmisa.ExtensionsのSビットで確認できます。

misa.ExtensionsのSビットを@<code>{1}に設定します
(@<list>{csrunit.veryl.misamppsxl.misa})。

//list[csrunit.veryl.misamppsxl.misa][Sビットを1にする (csrunit.veryl)]{
#@maprange(scripts/23/misamppsxl-range/core/src/csrunit.veryl,misa)
    let misa      : UIntX  = {2'd2, 1'b0 repeat XLEN - 28, 26'b0000010@<b>|1|000001000100000101}; // U, @<b>|S|, M, I, C, A
#@end
//}

S-modeのときのXLENはSXLENと定義されており、mstatus.SXLで確認できます。
本書ではSXLENが常に@<code>{64}になるように実装します。

mstatus.SXLを@<code>{64}を示す値である@<code>{2}に設定します
(
@<list>{eei.veryl.misamppsxl.sxl}、
@<list>{csrunit.veryl.misamppsxl.reset}
)。

//list[eei.veryl.misamppsxl.sxl][mstatus.SXLの定義 (eei.veryl)]{
#@maprange(scripts/23/misamppsxl-range/core/src/eei.veryl,sxl)
    const MSTATUS_UXL: UInt64 = 2 << 32;
    @<b>|const MSTATUS_SXL: UInt64 = 2 << 34;|
#@end
//}

#@# マップにする
//list[csrunit.veryl.misamppsxl.reset][mstatus.SXLの初期値を設定する (csrunit.veryl)]{
#@# maprange(scripts/23/misamppsxl-range/core/src/csrunit.veryl,reset)
    always_ff {
        if_reset {
            mode       = PrivMode::M;
            mstatus    = @<b>{MSTATUS_SXL |} MSTATUS_UXL;
#@# end
//}

今のところmstatus.MPPにはM-modeとU-modeを示す値しか書き込めないようにしているので、
S-modeの値(@<code>{2'b10})も書き込めるように変更します
(@<list>{csrunit.veryl.misamppsxl.mstatus})。
これにより、MRET命令でS-modeに移動できるようになります。

//list[csrunit.veryl.misamppsxl.mstatus][MPPにS-modeを書き込めるようにする (csrunit.veryl)]{
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

@<secref>{22-umode-csr|impl-mcounteren}では、
ハードウェアパフォーマンスモニタにU-modeでアクセスできるかをmcounterenレジスタで制御できるようにしました。
S-modeを導入するとmcounterenレジスタは
S-modeがハードウェアパフォーマンスモニタにアクセスできるかを制御するレジスタに変わります。
また、mcounterenレジスタの代わりに
U-modeでハードウェアパフォーマンスモニタにアクセスできるかを制御する32ビットのscounterenレジスタが追加されます。

scounterenレジスタのフィールドのビット配置はmcounterenレジスタと同じです。
また、U-modeでハードウェアパフォーマンスにアクセスできる条件は、
mcounterenレジスタとscounterenレジスタの両方によって許可されている場合になります。

scounterenレジスタを作成し、読み書きできるようにします
(
@<list>{csrunit.veryl.scounteren.reg}、
@<list>{csrunit.veryl.scounteren.reset}、
@<list>{csrunit.veryl.scounteren.rdata}、
@<list>{csrunit.veryl.scounteren.WMASK}、
@<list>{csrunit.veryl.scounteren.wmask}、
@<list>{csrunit.veryl.scounteren.write}
)。

//list[csrunit.veryl.scounteren.reg][scounternレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,reg)
    var scounteren: UInt32;
#@end
//}

//list[csrunit.veryl.scounteren.reset][scounterenレジスタを0でリセットする (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,reset)
    mtval      = 0;
    @<b>|scounteren = 0;|
    led        = 0;
#@end
//}

//list[csrunit.veryl.scounteren.rdata][rdataにscounterenレジスタの値を設定する (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MTVAL     : mtval,
    @<b>|CsrAddr::SCOUNTEREN: {1'b0 repeat XLEN - 32, scounteren},|
    CsrAddr::LED       : led,
#@end
//}

//list[csrunit.veryl.scounteren.WMASK][書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,WMASK)
    const SCOUNTEREN_WMASK: UIntX = 'h0000_0000_0000_0007 as UIntX;
#@end
//}

//list[csrunit.veryl.scounteren.wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,wmask)
    CsrAddr::MTVAL     : MTVAL_WMASK,
    @<b>|CsrAddr::SCOUNTEREN: SCOUNTEREN_WMASK,|
    CsrAddr::LED       : LED_WMASK,
#@end
//}

//list[csrunit.veryl.scounteren.write][scounterenレジスタに書き込む (csrunit.veryl)]{
#@maprange(scripts/23/scounteren-range/core/src/csrunit.veryl,write)
    CsrAddr::MTVAL     : mtval      = wdata;
    @<b>|CsrAddr::SCOUNTEREN: scounteren = wdata[31:0];|
    CsrAddr::LED       : led        = wdata;
#@end
//}

ハードウェアパフォーマンスモニタにアクセスするときに許可を確認する仕組みを実装します
(@<list>{csrunit.veryl.scounteren.priv})。
S-modeでアクセスするときはmcounterenレジスタだけ確認し、
U-modeでアクセスするときはmcounterenレジスタとscounterenレジスタを確認します。

//list[csrunit.veryl.scounteren.priv][許可の確認ロジックを変更する (csrunit.veryl)]{
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

//image[sstatus][sstatusレジスタ][width=90%]

sstatusレジスタはmstatusレジスタの一部をS-modeで読み込み、書き込みできるようにしたSXLENビットのレジスタです。
本章ではmstatusレジスタに読み込み、書き込みマスクを適用することでsstatusレジスタを実装します。

sstatusレジスタの書き込みマスクを定義します
(
@<list>{csrunit.veryl.sstatus.WMASK}、
@<list>{csrunit.veryl.sstatus.wmask}
)。

//list[csrunit.veryl.sstatus.WMASK][書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,WMASK)
    const SSTATUS_WMASK   : UIntX = 'h0000_0000_0000_0000 as UIntX;
#@end
//}

//list[csrunit.veryl.sstatus.wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,wmask)
    CsrAddr::MTVAL     : MTVAL_WMASK,
    @<b>|CsrAddr::SSTATUS   : SSTATUS_WMASK,|
    CsrAddr::SCOUNTEREN: SCOUNTEREN_WMASK,
#@end
//}

読み込みマスクを定義し、mstatusレジスタにマスクを適用した値をsstatusレジスタの値にします
(
@<list>{csrunit.veryl.sstatus.RMASK}、
@<list>{csrunit.veryl.sstatus.reg}、
@<list>{csrunit.veryl.sstatus.rdata}
)。

//list[csrunit.veryl.sstatus.RMASK][読み込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,RMASK)
    const SSTATUS_RMASK: UIntX = 'h8000_0003_018f_e762;
#@end
//}

//list[csrunit.veryl.sstatus.reg][sstatusの値をmstatusにマスクを適用したものにする (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,reg)
    let sstatus   : UIntX  = mstatus & SSTATUS_RMASK;
#@end
//}

//list[csrunit.veryl.sstatus.rdata][rdataにsstatusレジスタの値を設定する (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MTVAL     : mtval,
    @<b>|CsrAddr::SSTATUS   : sstatus,|
    CsrAddr::SCOUNTEREN: {1'b0 repeat XLEN - 32, scounteren},
#@end
//}

マスクを適用した書き込みを実装します
(@<list>{csrunit.veryl.sstatus.write})。
書き込みマスクが適用されたwdataと、
書き込みマスクをビット反転した値でマスクされたmstatusレジスタの値のORを書き込みます。

//list[csrunit.veryl.sstatus.write][sstatusレジスタへの書き込みでmstatusレジスタに書き込む (csrunit.veryl)]{
#@maprange(scripts/23/sstatus-range/core/src/csrunit.veryl,write)
    CsrAddr::SSTATUS   : mstatus    = validate_mstatus(mstatus, wdata | mstatus & ~SSTATUS_WMASK);
#@end
//}

=={delegating-trap} トラップの委譲

=== トラップの委譲

S-modeが実装されているとき、
S-modeとU-modeで発生するトラップの遷移先の特権レベルをM-modeからS-modeに変更(委譲)することができます。
特権レベルがM-modeのときに発生したトラップの特権レベルの遷移先をS-modeに変更することはできません。

M-modeからS-modeに委譲されたトラップのトラップベクタは、mtvecではなくstvecになります。
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

medelegレジスタは、どの例外を委譲するかを制御する64ビットのレジスタです。
medelegレジスタの下から@<code>{i}番目のビットが立っているとき、S-mode、U-modeで発生したcauseが@<code>{i}の例外をS-modeに委譲します。
M-modeで発生した例外はS-modeに委譲されません。

Environment call from M-mode例外のように委譲することができない命令のmedelegレジスタのビットは@<code>{1}に変更できません。

==== 割り込みの委譲

midelegレジスタは、どの割り込みを委譲するかを制御するMXLENビットのレジスタです。
各割り込みはmie、mipレジスタと同じ場所のmidelegレジスタのビットによって委譲されるかどうかが制御されます。

M-mode、S-mode、U-modeが実装されたCPUで、割り込みでM-modeに遷移する条件は次の通りです。

 1. 割り込み原因に対応したmipレジスタのビットが@<code>{1}である
 1. 割り込み原因に対応したmieレジスタのビットが@<code>{1}である
 1. 現在の特権レベルがM-mode未満である。またはmstatus.MIEが@<code>{1}である
 1. 割り込み原因に対応したmidelegレジスタのビットが@<code>{0}である

割り込みでS-modeに遷移する条件は次の通りです。

 1. 割り込み原因に対応したsipレジスタのビットが@<code>{1}である
 1. 割り込み原因に対応したsieレジスタのビットが@<code>{1}である
 1. 現在の特権レベルがS-mode未満である。またはS-modeのとき、sstatus.SIEが@<code>{1}である

sip、sieレジスタは、それぞれmip、mieレジスタの委譲された割り込みのビットだけ読み込み、書き込みできるようにしたレジスタです。
委譲されていない割り込みに対応したビットは読み込み専用の@<code>{0}になります。
S-modeに委譲された割り込みは、特権レベルがM-modeのときは発生しません。

S-modeに委譲された割り込みは外部割り込み、ソフトウェア割り込み、タイマ割り込みの順に優先されます。
委譲されていない割り込みを同じタイミングで発生させられるとき、委譲されていない割り込みが優先されます。

本書ではM-modeの外部割り込み(Machine external interrupt)、
ソフトウェア割り込み(Machine software interrupt)、
タイマ割り込み(Machine timer interrupt)はS-modeに委譲できないように実装します@<fn>{mideleg-no}。

//footnote[mideleg-no][多くの実装ではこれらの割り込みを委譲できないように実装するようです。そのため、本書で実装するコアでも委譲できないように実装します。]

=== トラップに関連するレジスタを作成する

S-modeに委譲されたトラップで使用するstvec、sscratch、sepc、scause、stvalレジスタを作成します
(
@<list>{csrunit.veryl.trapreg.reg}、
@<list>{csrunit.veryl.trapreg.reset}、
@<list>{csrunit.veryl.trapreg.rdata}、
@<list>{csrunit.veryl.trapreg.WMASK}、
@<list>{csrunit.veryl.trapreg.wmask}、
@<list>{csrunit.veryl.trapreg.write}
)。

//list[csrunit.veryl.trapreg.reg][レジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/23/trapreg-range/core/src/csrunit.veryl,reg)
    var stvec     : UIntX ;
    var sscratch  : UIntX ;
    var sepc      : UIntX ;
    var scause    : UIntX ;
    var stval     : UIntX ;
#@end
//}

//list[csrunit.veryl.trapreg.reset][レジスタを0でリセットする (csrunit.veryl)]{
#@maprange(scripts/23/trapreg-range/core/src/csrunit.veryl,reset)
    stvec      = 0;
    sscratch   = 0;
    sepc       = 0;
    scause     = 0;
    stval      = 0;
#@end
//}

//list[csrunit.veryl.trapreg.rdata][rdataにレジスタの値を割り当てる (csrunit.veryl)]{
#@maprange(scripts/23/trapreg-range/core/src/csrunit.veryl,rdata)
    CsrAddr::STVEC     : stvec,
    CsrAddr::SSCRATCH  : sscratch,
    CsrAddr::SEPC      : sepc,
    CsrAddr::SCAUSE    : scause,
    CsrAddr::STVAL     : stval,
#@end
//}

それぞれ、mtvec、mscratch、mepc、mcause、mtvalレジスタと同じ書き込みマスクを設定します。

//list[csrunit.veryl.trapreg.WMASK][書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/23/trapreg-range/core/src/csrunit.veryl,WMASK)
    const STVEC_WMASK     : UIntX = 'hffff_ffff_ffff_fffd;
    const SSCRATCH_WMASK  : UIntX = 'hffff_ffff_ffff_ffff;
    const SEPC_WMASK      : UIntX = 'hffff_ffff_ffff_fffe;
    const SCAUSE_WMASK    : UIntX = 'hffff_ffff_ffff_ffff;
    const STVAL_WMASK     : UIntX = 'hffff_ffff_ffff_ffff;
#@end
//}

//list[csrunit.veryl.trapreg.wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/23/trapreg-range/core/src/csrunit.veryl,wmask)
    CsrAddr::STVEC     : STVEC_WMASK,
    CsrAddr::SSCRATCH  : SSCRATCH_WMASK,
    CsrAddr::SEPC      : SEPC_WMASK,
    CsrAddr::SCAUSE    : SCAUSE_WMASK,
    CsrAddr::STVAL     : STVAL_WMASK,
#@end
//}

//list[csrunit.veryl.trapreg.write][レジスタの書き込み (csrunit.veryl)]{
#@maprange(scripts/23/trapreg-range/core/src/csrunit.veryl,write)
    CsrAddr::STVEC     : stvec      = wdata;
    CsrAddr::SSCRATCH  : sscratch   = wdata;
    CsrAddr::SEPC      : sepc       = wdata;
    CsrAddr::SCAUSE    : scause     = wdata;
    CsrAddr::STVAL     : stval      = wdata;
#@end
//}

=== stvecレジスタの実装

トラップが発生するとき、
遷移先の特権レベルがS-modeならstvecレジスタの値にジャンプするようにします
(
@<list>{csrunit.veryl.stvec.interrupt}、
@<list>{csrunit.veryl.stvec.expt}
)。
割り込み、例外それぞれにレジスタを選択する変数を定義し、
mtvecを使っていたところを新しい変数に置き換えます。

//list[csrunit.veryl.stvec.interrupt][トラップベクタを遷移先の特権レベルによって変更する (csrunit.veryl)]{
#@maprange(scripts/23/stvec-range/core/src/csrunit.veryl,interrupt)
    @<b>|let interrupt_xtvec : Addr = if interrupt_mode == PrivMode::M ? mtvec : stvec;|
    let interrupt_vector: Addr = if @<b>|interrupt_x|tvec[0] == 0 ?
        {@<b>|interrupt_x|tvec[msb:2], 2'b0}
    : // Direct
        {@<b>|interrupt_x|tvec[msb:2] + interrupt_cause[msb - 2:0], 2'b0}
    ; // Vectored
#@end
//}

//list[csrunit.veryl.stvec.expt][トラップベクタを遷移先の特権レベルによって変更する (csrunit.veryl)]{
#@maprange(scripts/23/stvec-range/core/src/csrunit.veryl,expt)
    @<b>|let expt_xtvec : Addr     = if expt_mode == PrivMode::M ? mtvec : stvec;|
    let expt_vector: Addr     = {@<b>|expt_x|tvec[msb:2], 2'b0};
#@end
//}

=== トラップでsepc、scause、stvalレジスタを変更する

トラップが発生するとき、
遷移先の特権レベルがS-modeならsepc、scause、stvalレジスタを変更するようにします。

トラップ時に@<code>{trap_mode_next}で処理を分岐します
(@<list>{csrunit.veryl.trapregchange.ff})。

//list[csrunit.veryl.trapregchange.ff][遷移先の特権レベルによってトラップ処理を分岐する (csrunit.veryl)]{
#@maprange(scripts/23/trapregchange-range/core/src/csrunit.veryl,ff)
if raise_expt || raise_interrupt {
    @<b>|let x|epc@<b>|: Addr| = if raise_expt ? pc : // exception
     if raise_interrupt && is_wfi ? pc + 4 : pc; // interrupt when wfi / interrupt
    @<b>|if trap_mode_next == PrivMode::M {|
        @<b>|mepc   = xepc;|
        mcause = trap_cause;
        if raise_expt {
            mtval = expt_value;
        }
        // save mstatus.mie to mstatus.mpie
        // and set mstatus.mie = 0
        mstatus[7] = mstatus[3];
        mstatus[3] = 0;
        // save current privilege level to mstatus.mpp
        mstatus[12:11] = mode;
    @<b>|} else {|
        @<b>|sepc   = xepc;|
        @<b>|scause = trap_cause;|
        @<b>|if raise_expt {|
        @<b>|    stval = expt_value;|
        @<b>|}|
    @<b>|}|
#@end
//}

=== mstatusのSIE、SPIE、SPPビットを実装する

mstatusレジスタのSIE、SPIE、SPPビットを実装します。
mstatus.SIEはS-modeに委譲された割り込みのグローバル割り込みイネーブルビットです。
mstatus.SPIEはS-modeに委譲されたトラップが発生するときにmstatus.SIEを退避するビットです。
mstatus.SPPはS-modeに委譲されたトラップが発生するときに、トラップ前の特権レベルを書き込むビットです。
S-modeに委譲されたトラップはS-modeかU-modeでしか発生しないため、
mstatus.SPPは特権レベルを区別するために十分な1ビット幅のフィールドになっています。

mstatus、sstatusレジスタのSIE、SPIE、SPPビットに書き込めるようにします
(
@<list>{csrunit.veryl.spp.mstatus_WMASK}、
@<list>{csrunit.veryl.spp.sstatus_WMASK}
)。

//list[csrunit.veryl.spp.mstatus_WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/23/spp-range/core/src/csrunit.veryl,mstatus_WMASK)
    const MSTATUS_WMASK   : UIntX = 'h0000_0000_0020_1@<b>|9aa| as UIntX;
#@end
//}

//list[csrunit.veryl.spp.sstatus_WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/23/spp-range/core/src/csrunit.veryl,sstatus_WMASK)
    const SSTATUS_WMASK   : UIntX = 'h0000_0000_0000_0@<b>|122| as UIntX;
#@end
//}

トラップでS-modeに遷移するとき、
sstatus.SPIEにsstatus.SIE、
sstatus.SIEに@<code>{0}、
sstatus.SPPにトラップ前の特権レベルを格納します
(@<list>{csrunit.veryl.spp.ff})。

//list[csrunit.veryl.spp.ff][sstatus.SPIE、SIE、SPPをトラップで変更する (csrunit.veryl)]{
#@maprange(scripts/23/spp-range/core/src/csrunit.veryl,ff)
    } else {
        sepc   = xepc;
        scause = trap_cause;
        if raise_expt {
            stval = expt_value;
        }
        @<b>|// save sstatus.sie to sstatus.spie|
        @<b>|// and set sstatus.sie = 0|
        @<b>|mstatus[5] = mstatus[1];|
        @<b>|mstatus[1] = 0;|
        @<b>|// save current privilege mode (S or U) to sstatus.spp|
        @<b>|mstatus[8] = mode[0];|
    }
#@end
//}

=== SRET命令を実装する

==== SRET命令の実装

SRET命令は、S-modeのCSR(sepc、sstatusなど)を利用してトラップ処理から戻るための命令です。
SRET命令はS-mode以上の特権レベルのときにしか実行できません。

inst_decoderモジュールでSRET命令をデコードできるようにします
(@<list>{inst_decoder.veryl.sret.SRET})。

//list[inst_decoder.veryl.sret.SRET][SRET命令のときvalidを1にする (inst_decoder.veryl)]{
#@maprange(scripts/23/sret-range/core/src/inst_decoder.veryl,SRET)
   OP_SYSTEM: f3 != 3'b000 && f3 != 3'b100 || // CSRR(W|S|C)[I]
    bits == 32'h00000073 || // ECALL
    bits == 32'h00100073 || // EBREAK
    bits == 32'h30200073 || //MRET
    @<b>{bits == 32'h10200073 || //SRET}
    bits == 32'h10500073, // WFI
#@end
//}

SRET命令を判定し、ジャンプ先と遷移先の特権レベルを命令によって切り替えます
(
@<list>{csrunit.veryl.sret.is_sret}、
@<list>{csrunit.veryl.sret.ret}、
@<list>{csrunit.veryl.sret.vec}
)。

//list[csrunit.veryl.sret.is_sret][SRT命令の判定 (csrunit.veryl)]{
#@maprange(scripts/23/sret-range/core/src/csrunit.veryl,is_sret)
    let is_sret: logic = inst_bits == 32'h10200073;
#@end
//}

//list[csrunit.veryl.sret.ret][SRET命令のとき遷移先の特権レベル、アドレスを変更する (csrunit.veryl)]{
#@maprange(scripts/23/sret-range/core/src/csrunit.veryl,ret)
    assign trap_return        = valid && @<b>{(}is_mret @<b>{|| is_sret)} && !raise_expt && !raise_interrupt;
    let trap_return_mode  : PrivMode = @<b>|if is_mret ?| mstatus_mpp @<b>|: mstatus_spp|;
    @<b>|let trap_return_vector: Addr     = if is_mret ? mepc : sepc;|
#@end
//}

//list[csrunit.veryl.sret.vec][trap_return_vectorをtrap_vectorに割り当てる (csrunit.veryl)]{
#@maprange(scripts/23/sret-range/core/src/csrunit.veryl,vec)
    assign trap_vector = switch {
        raise_expt     : expt_vector,
        raise_interrupt: interrupt_vector,
        trap_return    : @<b>|trap_return_vector|,
        default        : 0,
    };
#@end
//}

SRET命令を実行するとき、
sstatus.SIEにsstatus.SPIE、
sstatus.SPIEに@<code>{0}、
sstatus.SPPに実装がサポートする最小の特権レベル(U-mode)を示す値を格納します
(@<list>{csrunit.veryl.sret.ff})。

//list[csrunit.veryl.sret.ff][SRET命令によるsstatusの変更 (csrunit.veryl)]{
#@maprange(scripts/23/sret-range/core/src/csrunit.veryl,ff)
    } else if trap_return {
        @<b>|if is_mret {|
            // set mstatus.mie = mstatus.mpie
            //     mstatus.mpie = 0
            mstatus[3] = mstatus[7];
            mstatus[7] = 0;
            // set mstatus.mpp = U (least privilege level)
            mstatus[12:11] = PrivMode::U;
        @<b>|} else if is_sret {|
        @<b>|    // set sstatus.sie = sstatus.spie|
        @<b>|    //     sstatus.spie = 0|
        @<b>|    mstatus[1] = mstatus[5];|
        @<b>|    mstatus[5] = 0;|
        @<b>|    // set sstatus.spp = U (least privilege level)|
        @<b>|    mstatus[8] = 0;|
        @<b>|}|
    }
#@end
//}

SRET命令をS-mode未満の特権レベルで実行しようとしたら例外が発生するようにします
(@<list>{csrunit.veryl.sret.priv})。

//list[csrunit.veryl.sret.priv][SRET命令を実行するときに特権レベルを確認する (csrunit.veryl)]{
#@maprange(scripts/23/sret-range/core/src/csrunit.veryl,priv)
    let expt_trap_return_priv: logic = (is_mret && mode <: PrivMode::M) @<b>{|| (is_sret && mode <: PrivMode::S)};
#@end
//}

==== mstatus.TSRの実装

mstatusレジスタのTSR(Trap SRET)ビットは、
SRET命令をS-modeで実行したときに例外を発生させるかを制御するビットです。
@<code>{1}のとき、Illegal instruction例外が発生するようになります。

mstatus.TSRを変更できるようにします
(@<list>{csrunit.veryl.tsr.WMASK})。

//list[csrunit.veryl.tsr.WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/23/tsr-range/core/src/csrunit.veryl,WMASK)
    const MSTATUS_WMASK   : UIntX = 'h0000_0000_00@<b>|6|0_19aa as UIntX;
#@end
//}

例外を判定します
(
@<list>{csrunit.veryl.tsr.tw}、
@<list>{csrunit.veryl.tsr.priv}
)。

//list[csrunit.veryl.tsr.tw][TSRビットを表す変数 (csrunit.veryl)]{
#@maprange(scripts/23/tsr-range/core/src/csrunit.veryl,tsr)
    let mstatus_tsr : logic    = mstatus[22];
#@end
//}

//list[csrunit.veryl.tsr.priv][mstatus.TSRが1のときにS-modeでSRET命令を実行したら例外にする (csrunit.veryl)]{
#@maprange(scripts/23/tsr-range/core/src/csrunit.veryl,priv)
    let expt_trap_return_priv: logic = (is_mret && mode <: PrivMode::M) || (is_sret && @<b>{(}mode <: PrivMode::S @<b>{|| (mode == PrivMode::S && mstatus_tsr)}));
#@end
//}


=== SEI、SSI、STIを実装する

S-modeを導入すると、
S-modeの外部割り込み(Supervisor external interrupt)、
ソフトウェア割り込み(Supervisor software interrupt)、
タイマ割り込み(Supervisor timer interrupt)に対応する
mip、mieレジスタのビットを変更できるようになります。

例外、割り込みはそれぞれmedeleg、midelegレジスタでS-modeに処理を委譲することができます。
委譲された割り込みのmipレジスタの値はsipレジスタで観測できるようになり、
割り込みを有効にするかをsieレジスタで制御できるようになります。

==== mip、mieレジスタの変更

mipレジスタのSEIP、SSIP、STIPビット、
mieレジスタのSEIE、SSIE、STIEビットを変更できるようにします。

書き込みマスクを変更、実装します
(
@<list>{csrunit.veryl.mipreg.WMASK}、
@<list>{csrunit.veryl.mipreg.wmask}、
@<list>{csrunit.veryl.mipreg.mip}、
@<list>{csrunit.veryl.mipreg.reset}、
@<list>{csrunit.veryl.mipreg.write}
)。

//list[csrunit.veryl.mipreg.WMASK][書き込みマスクの定義 / 変更 (csrunit.veryl)]{
#@maprange(scripts/23/mipreg-range/core/src/csrunit.veryl,WMASK)
    @<b>|const MIP_WMASK       : UIntX = 'h0000_0000_0000_0222 as UIntX;|
    const MIE_WMASK       : UIntX = 'h0000_0000_0000_0@<b>|2aa| as UIntX;
#@end
//}

//list[csrunit.veryl.mipreg.wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/23/mipreg-range/core/src/csrunit.veryl,wmask)
    CsrAddr::MIP       : MIP_WMASK,
#@end
//}

@<code>{mip_reg}レジスタを作成します。
@<code>{mip}の値を、@<code>{mip_reg}とACLINTの状態をOR演算したものに変更します
()。

//list[csrunit.veryl.mipreg.mip][レジスタを作成して変数に適用する (csrunit.veryl)]{
#@maprange(scripts/23/mipreg-range/core/src/csrunit.veryl,mip)
    @<b>|var mip_reg: UIntX;|
    let mip    : UIntX = @<b>{mip_reg |} {
#@end
//}

@<code>{mip_reg}レジスタのリセット、書き込みを実装します
()。
@<code>{wdata}にはACLINTの状態が含まれているので、書き込みマスクをもう一度適用します。

//list[csrunit.veryl.mipreg.reset][レジスタの値を0でリセットする (csrunit.veryl)]{
#@maprange(scripts/23/mipreg-range/core/src/csrunit.veryl,reset)
    mie        = 0;
    @<b>|mip_reg    = 0;|
    mcounteren = 0;
#@end
//}

//list[csrunit.veryl.mipreg.write][mipレジスタの書き込み (csrunit.veryl)]{
#@maprange(scripts/23/mipreg-range/core/src/csrunit.veryl,write)
    CsrAddr::MTVEC     : mtvec      = wdata;
    @<b>|CsrAddr::MIP       : mip_reg    = wdata & MIP_WMASK;|
    CsrAddr::MIE       : mie        = wdata;
#@end
//}

==== causeの設定

S-modeの割り込みのcauseを設定します
(@<list>{csrunit.veryl.mipreg.cause})。

//list[csrunit.veryl.mipreg.cause][割り込み原因の追加 (csrunit.veryl)]{
#@maprange(scripts/23/mipreg-range/core/src/csrunit.veryl,cause)
    let interrupt_cause  : UIntX = switch {
        interrupt_pending[3]: CsrCause::MACHINE_SOFTWARE_INTERRUPT,
        interrupt_pending[7]: CsrCause::MACHINE_TIMER_INTERRUPT,
        @<b>|interrupt_pending[9]: CsrCause::SUPERVISOR_EXTERNAL_INTERRUPT,|
        @<b>|interrupt_pending[1]: CsrCause::SUPERVISOR_SOFTWARE_INTERRUPT,|
        @<b>|interrupt_pending[5]: CsrCause::SUPERVISOR_TIMER_INTERRUPT,|
        default             : 0,
    };
#@end
//}

==== medeleg、mideleg、sip、sieレジスタの実装

//image[sip][sipレジスタ][width=90%]
//image[sie][sieレジスタ][width=90%]

medeleg、mideleg、sip、sieレジスタを実装します。

medeleg、midelegレジスタはそれぞれ委譲できる例外、割り込みに対応するビットだけ書き換えられるようにします。
sipレジスタはmidelegレジスタで委譲された割り込みに対応するビットだけ値を参照できるように、
sieレジスタはmidelegレジスタで委譲された割り込みに対応するビットだけ書き換えられるようにします。

レジスタを作成し、読み込めるようにします
(
@<list>{csrunit.veryl.siesipdeleg.deleg}、
@<list>{csrunit.veryl.siesipdeleg.sipsie}、
@<list>{csrunit.veryl.siesipdeleg.deleg_reset}、
@<list>{csrunit.veryl.siesipdeleg.si_reset}、
@<list>{csrunit.veryl.siesipdeleg.deleg_rdata}、
@<list>{csrunit.veryl.siesipdeleg.si_rdata}
)。

//list[csrunit.veryl.siesipdeleg.deleg][medeleg、midelegレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,deleg)
    var medeleg   : UInt64;
    var mideleg   : UIntX ;
#@end
//}

//list[csrunit.veryl.siesipdeleg.sipsie][sie、sieレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,sipsie)
    let sip       : UIntX  = mip & mideleg;
    var sie       : UIntX ;
#@end
//}

//list[csrunit.veryl.siesipdeleg.deleg_reset][medeleg、midelegレジスタを0でリセットする (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,deleg_reset)
    medeleg    = 0;
    mideleg    = 0;
#@end
//}

//list[csrunit.veryl.siesipdeleg.si_reset][sieレジスタを0でリセットする (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,sie_reset)
    sie        = 0;
#@end
//}

//list[csrunit.veryl.siesipdeleg.deleg_rdata][rdataにmedeleg、midelegレジスタの値を割り当てる (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,deleg_rdata)
    CsrAddr::MEDELEG   : medeleg,
    CsrAddr::MIDELEG   : mideleg,
#@end
//}

//list[csrunit.veryl.siesipdeleg.si_rdata][rdataにsip、sieレジスタの値を割り当てる (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,si_rdata)
    CsrAddr::SIP       : sip,
    CsrAddr::SIE       : sie & mideleg,
#@end
//}

書き込みマスクを設定し、書き込めるようにします
(
@<list>{csrunit.veryl.siesipdeleg.WMASK_deleg}、
@<list>{csrunit.veryl.siesipdeleg.WMASK_sie}、
@<list>{csrunit.veryl.siesipdeleg.deleg_wmask}、
@<list>{csrunit.veryl.siesipdeleg.sie_wmask}、
@<list>{csrunit.veryl.siesipdeleg.deleg_write}、
@<list>{csrunit.veryl.siesipdeleg.sie_write}
)。

//list[csrunit.veryl.siesipdeleg.WMASK_deleg][書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,WMASK_deleg)
    const MEDELEG_WMASK   : UIntX = 'hffff_ffff_fffe_f7ff;
    const MIDELEG_WMASK   : UIntX = 'h0000_0000_0000_0222 as UIntX;
#@end
//}

//list[csrunit.veryl.siesipdeleg.WMASK_sie][書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,WMASK_sie)
    const SIE_WMASK       : UIntX = 'h0000_0000_0000_0222 as UIntX;
#@end
//}

//list[csrunit.veryl.siesipdeleg.deleg_wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,deleg_wmask)
    CsrAddr::MEDELEG   : MEDELEG_WMASK,
    CsrAddr::MIDELEG   : MIDELEG_WMASK,
#@end
//}

//list[csrunit.veryl.siesipdeleg.sie_wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,sie_wmask)
    CsrAddr::SIE       : SIE_WMASK & mideleg,
#@end
//}


//list[csrunit.veryl.siesipdeleg.deleg_write][medeleg、midelegレジスタの書き込み (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,deleg_write)
    CsrAddr::MEDELEG   : medeleg    = wdata;
    CsrAddr::MIDELEG   : mideleg    = wdata;
#@end
//}

//list[csrunit.veryl.siesipdeleg.sie_write][sieレジスタの書き込み (csrunit.veryl)]{
#@maprange(scripts/23/siesipdeleg-range/core/src/csrunit.veryl,sie_write)
    CsrAddr::SIE       : sie        = wdata;
#@end
//}

=== 割り込み条件、トラップの動作を変更する

作成したCSRを利用して、割り込みが発生する条件、トラップが発生したときのCSRの操作を変更します。

例外が発生するとき、遷移先の特権レベルをmedelegレジスタによって変更します
(@<list>{csrunit.veryl.trapdeleg.expt}）。

//list[csrunit.veryl.trapdeleg.expt][例外の遷移先の特権レベルを求める (csrunit.veryl)]{
#@maprange(scripts/23/trapdeleg-range/core/src/csrunit.veryl,expt)
    let expt_mode  : PrivMode = @<b>{if mode == PrivMode::M || !medeleg[expt_cause[5:0]] ?} PrivMode::M @<b>{: PrivMode::S};
#@end
//}

割り込みの発生条件と参照するCSRを、遷移先の特権レベルごとに用意します
(
@<list>{csrunit.veryl.trapdeleg.mmode}、
@<list>{csrunit.veryl.trapdeleg.smode}
）。

//list[csrunit.veryl.trapdeleg.mmode][M-modeに遷移する割り込みを示す変数 (csrunit.veryl)]{
#@maprange(scripts/23/trapdeleg-range/core/src/csrunit.veryl,mmode)
    // Interrupt to M-mode
    let interrupt_pending_mmode: UIntX = mip & mie & ~mideleg;
    let raise_interrupt_mmode  : logic = (mode != PrivMode::M || mstatus_mie) && interrupt_pending_mmode != 0;
    let interrupt_cause_mmode  : UIntX = switch {
        interrupt_pending_mmode[3]: CsrCause::MACHINE_SOFTWARE_INTERRUPT,
        interrupt_pending_mmode[7]: CsrCause::MACHINE_TIMER_INTERRUPT,
        interrupt_pending_mmode[9]: CsrCause::SUPERVISOR_EXTERNAL_INTERRUPT,
        interrupt_pending_mmode[1]: CsrCause::SUPERVISOR_SOFTWARE_INTERRUPT,
        interrupt_pending_mmode[5]: CsrCause::SUPERVISOR_TIMER_INTERRUPT,
        default                   : 0,
    };
#@end
//}

//list[csrunit.veryl.trapdeleg.smode][S-modeに遷移する割り込みを示す変数 (csrunit.veryl)]{
#@maprange(scripts/23/trapdeleg-range/core/src/csrunit.veryl,smode)
    // Interrupt to S-mode
    let interrupt_pending_smode: UIntX = sip & sie;
    let raise_interrupt_smode  : logic = (mode <: PrivMode::S || (mode == PrivMode::S && mstatus_sie)) && interrupt_pending_smode != 0;
    let interrupt_cause_smode  : UIntX = switch {
        interrupt_pending_smode[9]: CsrCause::SUPERVISOR_EXTERNAL_INTERRUPT,
        interrupt_pending_smode[1]: CsrCause::SUPERVISOR_SOFTWARE_INTERRUPT,
        interrupt_pending_smode[5]: CsrCause::SUPERVISOR_TIMER_INTERRUPT,
        default                   : 0,
    };
#@end
//}

M-mode向けの割り込みを優先して利用します
(@<list>{csrunit.veryl.trapdeleg.intr}）。

//list[csrunit.veryl.trapdeleg.intr][M-mode、S-modeに遷移する割り込みを調停する (csrunit.veryl)]{
#@maprange(scripts/23/trapdeleg-range/core/src/csrunit.veryl,intr)
    // Interrupt
    let raise_interrupt : logic = valid && can_intr && (@<b>{raise_interrupt_mmode || raise_interrupt_smode});
    let interrupt_cause : UIntX = @<b>|if raise_interrupt_mmode ? interrupt_cause_mmode : interrupt_cause_smode|;
    let interrupt_xtvec : Addr  = if interrupt_mode == PrivMode::M ? mtvec : stvec;
    let interrupt_vector: Addr  = if interrupt_xtvec[0] == 0 ?
        {interrupt_xtvec[msb:2], 2'b0}
    : // Direct
        {interrupt_xtvec[msb:2] + interrupt_cause[msb - 2:0], 2'b0}
    ; // Vectored
    let interrupt_mode: PrivMode = @<b>|if raise_interrupt_mmode ?| PrivMode::M @<b>|: PrivMode::S|;
#@end
//}

=={impl-sswi} ソフトウェア割り込みの実装 (SSWI)

SSWIデバイスはソフトウェア割り込み(supervisor software insterrupt)を提供するためのデバイスです。
SSWIデバイスにはハードウェアスレッド毎に4バイトのSETSSIPレジスタが用意されています(TODO テーブル)
SETSSIPレジスタを読み込むと常に@<code>{0}を返しますが、
最下位ビットに@<code>{1}を書き込むとそれに対応するハードウェアスレッドのmip.SSIPビットが@<code>{1}になります。

TODOテーブル4095個

//image[setssip][setssipレジスタ][width=90%]

今のところmhartidが@<code>{0}のハードウェアスレッドしか存在しないため、SETSSIP0のみ実装します。
aclint_ifインターフェースに、
mipレジスタのSSIPビットを@<code>{1}にする要求のための@<code>{setssip}を作成します
(
@<list>{aclint_if.veryl.sswi.setssip}、
@<list>{aclint_memory.veryl.sswi.comb}
）。

//list[aclint_if.veryl.sswi.setssip][setssipをインターフェースに追加する (aclint_if.veryl)]{
#@maprange(scripts/23/sswi-range/core/src/aclint_if.veryl,setssip)
interface aclint_if {
    var msip   : logic ;
    var mtip   : logic ;
    var mtime  : UInt64;
    @<b>|var setssip: logic ;|
    modport master {
        msip   : output,
        mtip   : output,
        mtime  : output,
        @<b>|setssip: output,|
    }
#@end
//}

aclintモジュールでSETSSIP0への書き込みを検知し、最下位ビットを@<code>{setssip}に接続します。

//list[aclint_memory.veryl.sswi.comb][SETSSIP0に書き込むときsetssipにLSBを割り当てる (aclint_memory.veryl)]{
#@maprange(scripts/23/sswi-range/core/src/aclint_memory.veryl,comb)
    always_comb {
        aclint.setssip = 0;
        if membus.valid && membus.wen && membus.addr == MMAP_ACLINT_SETSSIP {
            aclint.setssip = membus.wdata[0];
        }
    }
#@end
//}

csrunitモジュールで@<code>{setssip}を確認し、mip.SSIPを立てるようにします
(
@<list>{csrunit.veryl.sswi.reg}、
@<list>{csrunit.veryl.sswi.update}、
@<list>{csrunit.veryl.sswi.write}
)。

//list[csrunit.veryl.sswi.reg][setssipをXLENビットに拡張する (csrunit.veryl)]{
#@maprange(scripts/23/sswi-range/core/src/csrunit.veryl,reg)
    let setssip: UIntX = {1'b0 repeat XLEN - 2, aclint.setssip, 1'b0};
#@end
//}

//list[csrunit.veryl.sswi.update][setssipでmipを更新する (csrunit.veryl)]{
#@maprange(scripts/23/sswi-range/core/src/csrunit.veryl,update)
    } else {
        mcycle  += 1;
        mip_reg |= setssip;
#@end
//}

//list[csrunit.veryl.sswi.write][setssipでmipを更新する (csrunit.veryl)]{
#@maprange(scripts/23/sswi-range/core/src/csrunit.veryl,write)
    CsrAddr::MIP       : mip_reg    = @<b>{(}wdata & MIP_WMASK@<b>{) | setssip};
#@end
//}