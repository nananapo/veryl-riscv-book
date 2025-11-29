= U-modeの実装

//abstract{
//}

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

misa.ExtensionsのUビットを@<code>{1}にします
(@<list>{csrunit.veryl.misa.misa})。

//list[csrunit.veryl.misa.misa][Uビットを1にする (csrunit.veryl)]{
#@maprange(scripts/22/misa-range/core/src/csrunit.veryl,misa)
    let misa    : UIntX  = {2'd2, 1'b0 repeat XLEN - 28, 26'b00000@<b>|1|00000001000100000101}; // U, M, I, C, A
#@end
//}

== mstatus.UXLの実装

U-modeのときのXLENはUXLENと定義されておりmstatus.UXLで確認できます。
仕様上はmstatus.UXLの書き換えでUXLENを変更できるように実装できますが、
本書ではUXLENが常に@<code>{64}になるように実装します。

mstatus.UXLを@<code>{64}を示す値である@<code>{2}に設定します
(
@<list>{eei.veryl.misa.def}、
@<list>{csrunit.veryl.misa.reset}
)。

//list[eei.veryl.misa.def][mstatus.UXLの定義 (eei.veryl)]{
#@maprange(scripts/22/misa-range/core/src/eei.veryl,def)
    // mstatus
    const MSTATUS_UXL: UInt64 = 2 << 32;
#@end
//}

//list[csrunit.veryl.misa.reset][UXLの初期値を設定する (csrunit.veryl)]{
#@maprange(scripts/22/misa-range/core/src/csrunit.veryl,reset)
    always_ff {
        if_reset {
            mode     = PrivMode::M;
            mstatus  = @<b>|MSTATUS_UXL|;
            mtvec    = 0;
#@end
//}

== mstatus.TWの実装

mstatus.TWは、M-modeよりも低い特権レベルでWFI命令を実行するときに時間制限(Timeout Wait)を設けるためのビットです。
mstatus.TWが@<code>{0}のとき時間制限はありません。
@<code>{1}に設定されているとき、CPUの実装固有の時間だけ実行の再開を待ち、
時間制限を過ぎるとIllegal instruction例外を発生させます。

本書ではmstatus.TWが@<code>{1}のときに無限時間待てることにして、例外の実装を省略します。
mstatus.TWを書き換えられるようにします
(@<list>{csrunit.veryl.tw.WMASK})。

//list[csrunit.veryl.tw.WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/22/tw-range/core/src/csrunit.veryl,WMASK)
    const MSTATUS_WMASK : UIntX = 'h0000_0000_00@<b>|2|0_0088 as UIntX;
#@end
//}

#@# FIXME コミットメッセージがmake it readableになってる (writableが正)

== mstatus.MPPの実装

#@# 遷移の図

M-mode、U-modeだけが存在する環境でトラップが発生するとき、
CPUはmstatusレジスタのMPPフィールドに現在の特権レベル(を示す値)を保存し、
特権レベルをM-modeに変更します。
また、MRET命令を実行するとmstatus.MPPの特権レベルに移動するようになります。

これにより、
トラップによるU(M)-modeからM-modeへの遷移、
MRET命令によるM-modeからU-modeへの遷移を実現できます。

MRET命令を実行するとmstatus.MPPは実装がサポートする最低の特権レベルに設定されます。

M-modeからU-modeに遷移したいときは、mstatus.MPPをU-modeの値に変更し、
U-modeで実行を開始したいアドレスをmepcレジスタに設定してMRET命令を実行します。

mstatus.MPPに値を書き込めるようにします
(@<list>{csrunit.veryl.mpp.WMASK})。

//list[csrunit.veryl.mpp.WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,WMASK)
    const MSTATUS_WMASK : UIntX = 'h0000_0000_0020_@<b>|18|88 as UIntX;
#@end
//}

MPPには@<code>{2'b00}(U-mode)と@<code>{2'b11}(M-mode)のみ設定できるようにします。
サポートしていない値を書き込もうとする場合は現在の値を維持します
(
@<list>{csrunit.veryl.mpp.write}、
@<list>{csrunit.veryl.mpp.func}
)。

//list[csrunit.veryl.mpp.write][mstatusの書き込み (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,write)
                            CsrAddr::MSTATUS : mstatus  = validate_mstatus(mstatus, wdata);
#@end
//}

//list[csrunit.veryl.mpp.func][mstatusレジスタの値を確認する関数 (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,func)
    function validate_mstatus (
        mstatus: input UIntX,
        wdata  : input UIntX,
    ) -> UIntX {
        var result: UIntX;
        result = wdata;
        // MPP
        if wdata[12:11] != PrivMode::M && wdata[12:11] != PrivMode::U {
            result[12:11] = mstatus[12:11];
        }
        return result;
    }
#@end
//}

トラップが発生する、トラップから戻るときの遷移先の特権レベルを求めます
(
@<list>{csrunit.veryl.mpp.mpp}、
@<list>{csrunit.veryl.mpp.interrupt_mode}、
@<list>{csrunit.veryl.mpp.expt_mode}、
@<list>{csrunit.veryl.mpp.trap_return_mode}、
@<list>{csrunit.veryl.mpp.trap_mode_next}
)。

//list[csrunit.veryl.mpp.mpp][ビットを変数として定義する (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,mpp)
    @<b>|let mstatus_mpp : PrivMode = mstatus[12:11] as PrivMode;|
    let mstatus_mpie: logic    = mstatus[7];
    let mstatus_mie : logic    = mstatus[3];
#@end
//}

//list[csrunit.veryl.mpp.interrupt_mode][割り込みの遷移先の特権レベルを示す変数 (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,interrupt_mode)
    let interrupt_mode: PrivMode = PrivMode::M;
#@end
//}

//list[csrunit.veryl.mpp.expt_mode][例外の遷移先の特権レベルを示す変数 (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,expt_mode)
    let expt_mode  : PrivMode = PrivMode::M;
#@end
//}

//list[csrunit.veryl.mpp.trap_return_mode][MRET命令の遷移先の特権レベルを示す変数 (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,trap_return_mode)
    let trap_return_mode: PrivMode = mstatus_mpp;
#@end
//}

//list[csrunit.veryl.mpp.trap_mode_next][遷移先の特権レベルを求める (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,trap_mode_next)
    let trap_mode_next: PrivMode = switch {
        raise_expt     : expt_mode,
        raise_interrupt: interrupt_mode,
        trap_return    : trap_return_mode,
        default        : PrivMode::U,
    };
#@end
//}

トラップが発生するとき、mstatus.MPPに現在の特権レベルを保存します
(@<list>{csrunit.veryl.mpp.trap})。
また、トラップから戻るとき、特権レベルをmstatus.MPPに設定し、
mstatus.MPPに実装がサポートする最小の特権レベルである@<code>{PrivMode::U}を書き込みます。

//list[csrunit.veryl.mpp.trap][特権レベル、mstatus.MPPを更新する (csrunit.veryl)]{
#@maprange(scripts/22/mpp-range/core/src/csrunit.veryl,trap)
                if raise_trap {
                    if raise_expt || raise_interrupt {
                        mepc = if raise_expt ? pc : // exception
                         if raise_interrupt && is_wfi ? pc + 4 : pc; // interrupt when wfi / interrupt
                        mcause = trap_cause;
                        mtval  = if raise_expt ? expt_value : 0;
                        // save mstatus.mie to mstatus.mpie
                        // and set mstatus.mie = 0
                        mstatus[7] = mstatus[3];
                        mstatus[3] = 0;
                        @<b>|// save current privilege level to mstatus.mpp|
                        @<b>|mstatus[12:11] = mode;|
                    } else if trap_return {
                        // set mstatus.mie = mstatus.mpie
                        //     mstatus.mpie = 1
                        mstatus[3] = mstatus[7];
                        mstatus[7] = 1;
                        @<b>|// set mstatus.mpp = U (least privilege level)|
                        @<b>|mstatus[12:11] = PrivMode::U;|
                    }
                    mode = trap_mode_next;
#@end
//}

== CSRのアクセス権限の確認

CSRのアドレスを@<code>{csr_addr}とするとき、
@<code>{csr_addr[9:8]}の2ビットはそのCSRにアクセスできる最低の特権レベルを表しています。
これを下回る特権レベルでCSRにアクセスしようとするとIllegal instruction例外が発生します。

CSRのアドレスと特権レベルを確認して、例外を起こすようにします
(
@<list>{csrunit.veryl.csrrwpriv.priv}、
@<list>{csrunit.veryl.csrrwpriv.raise_expt}、
@<list>{csrunit.veryl.csrrwpriv.cause}
)。

//list[csrunit.veryl.csrrwpriv.priv][現在の特権レベルでCSRにアクセスできるか判定する (csrunit.veryl)]{
#@maprange(scripts/22/csrrwpriv-range/core/src/csrunit.veryl,priv)
    let expt_csr_priv_violation: logic = is_wsc && csr_addr[9:8] >: mode; // attempt to access CSR without privilege level
#@end
//}

//list[csrunit.veryl.csrrwpriv.raise_expt][例外の発生条件に追加する (csrunit.veryl)]{
#@maprange(scripts/22/csrrwpriv-range/core/src/csrunit.veryl,raise_expt)
    let raise_expt: logic = valid && (expt_info.valid || expt_write_readonly_csr || @<b>{expt_csr_priv_violation});
#@end
//}

//list[csrunit.veryl.csrrwpriv.cause][causeを設定する (csrunit.veryl)]{
#@maprange(scripts/22/csrrwpriv-range/core/src/csrunit.veryl,cause)
        expt_write_readonly_csr: CsrCause::ILLEGAL_INSTRUCTION,
        @<b>|expt_csr_priv_violation: CsrCause::ILLEGAL_INSTRUCTION,|
        default                : 0,
#@end
//}

=={impl-mcounteren} mcounterenレジスタの実装

//image[mcounteren][mcounterenレジスタ][width=90%]

mcounterenレジスタは、M-modeの次に低い特権レベルで
ハードウェアパフォーマンスモニタにアクセスできるようにするかを制御する32ビットのレジスタです(@<img>{mcounteren})。
CY、TM、IRビットはそれぞれcycle、time、instretにアクセスできるかどうかを制御します@<fn>{hpmcounter}。

//footnote[hpmcounter][hpmcounterレジスタを制御するHPMビットもありますが、hpmcounterレジスタを実装していないので実装しません]

本章でM-modeの次に低い特権レベルとしてU-modeを実装するため、
mcounterenレジスタはU-modeでのアクセスを制御します。
mcounterenレジスタで許可されていないままU-modeでcycle、time、instretレジスタにアクセスしようとすると、
Illelgal Instruction例外が発生します。

mcounterenレジスタを作成し、CY、TM、IRビットに書き込みできるようにします
(
@<list>{csrunit.veryl.mcounteren.reg}、
@<list>{csrunit.veryl.mcounteren.rdata}、
@<list>{csrunit.veryl.mcounteren.WMASK}、
@<list>{csrunit.veryl.mcounteren.wmask}、
@<list>{csrunit.veryl.mcounteren.reset}、
@<list>{csrunit.veryl.mcounteren.write}
)。

//list[csrunit.veryl.mcounteren.reg][mcounterenレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,reg)
    var mcounteren: UInt32;
#@end
//}

//list[csrunit.veryl.mcounteren.reset][mcounterenレジスタを0でリセットする (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,reset)
            mie        = 0;
            @<b>|mcounteren = 0;|
            mscratch   = 0;
#@end
//}

//list[csrunit.veryl.mcounteren.rdata][rdataにmcounterenレジスタを設定する (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,rdata)
            CsrAddr::MIE       : mie,
            @<b>|CsrAddr::MCOUNTEREN: {1'b0 repeat XLEN - 32, mcounteren},|
            CsrAddr::MCYCLE    : mcycle,
#@end
//}

//list[csrunit.veryl.mcounteren.WMASK][書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,WMASK)
    const MCOUNTEREN_WMASK: UIntX = 'h0000_0000_0000_0007 as UIntX;
#@end
//}

//list[csrunit.veryl.mcounteren.wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,wmask)
            CsrAddr::MIE       : MIE_WMASK,
            @<b>|CsrAddr::MCOUNTEREN: MCOUNTEREN_WMASK,|
            CsrAddr::MSCRATCH  : MSCRATCH_WMASK,
#@end
//}

//list[csrunit.veryl.mcounteren.write][mcounterenレジスタの書き込み (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,write)
                            CsrAddr::MIE       : mie        = wdata;
                            @<b>|CsrAddr::MCOUNTEREN: mcounteren = wdata[31:0];|
                            CsrAddr::MSCRATCH  : mscratch   = wdata;
#@end
//}

U-modeでハードウェアパフォーマンスモニタにアクセスするとき、
mcounterenレジスタのビットが@<code>{0}ならIllegal instruction例外を発生させます
(
@<list>{csrunit.veryl.mcounteren.priv}、
@<list>{csrunit.veryl.mcounteren.cause}
)。

//list[csrunit.veryl.mcounteren.priv][U-modeのとき、mcounterenレジスタを確認する (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,priv)
    let expt_zicntr_priv       : logic = is_wsc && mode == PrivMode::U && case csr_addr {
        CsrAddr::CYCLE  : !mcounteren[0],
        CsrAddr::TIME   : !mcounteren[1],
        CsrAddr::INSTRET: !mcounteren[2],
        default         : 0,
    }; // attemp to access Zicntr CSR without permission
#@end
//}

//list[csrunit.veryl.mcounteren.cause][causeを設定する (csrunit.veryl)]{
#@maprange(scripts/22/mcounteren-range/core/src/csrunit.veryl,cause)
        expt_csr_priv_violation: CsrCause::ILLEGAL_INSTRUCTION,
        @<b>|expt_zicntr_priv       : CsrCause::ILLEGAL_INSTRUCTION,|
        default                : 0,
#@end
//}


== MRET命令の実行を制限する

MRET命令はM-mode以上の特権レベルのときにしか実行できません。
M-mode未満の特権レベルでMRET命令を実行しようとするとIllegal instruction例外が発生します。

命令がMRET命令のとき、特権レベルを確認して例外を発生させます
(
@<list>{csrunit.veryl.umret.priv}、
@<list>{csrunit.veryl.umret.raise_expt}、
@<list>{csrunit.veryl.umret.cause}
)。

//list[csrunit.veryl.umret.priv][MRET命令を実行するとき、現在の特権レベルを確認する (csrunit.veryl)]{
#@maprange(scripts/22/umret-range/core/src/csrunit.veryl,priv)
    let expt_trap_return_priv: logic = is_mret && mode <: PrivMode::M; // attempt to execute trap return instruction in low privilege level
#@end
//}

//list[csrunit.veryl.umret.raise_expt][例外の発生条件に追加する (csrunit.veryl)]{
#@maprange(scripts/22/umret-range/core/src/csrunit.veryl,raise_expt)
    let raise_expt: logic = valid && (expt_info.valid || expt_write_readonly_csr || expt_csr_priv_violation || expt_zicntr_priv @<b>{|| expt_trap_return_priv});
#@end
//}

//list[csrunit.veryl.umret.cause][causeを設定する (csrunit.veryl)]{
#@maprange(scripts/22/umret-range/core/src/csrunit.veryl,cause)
        expt_zicntr_priv       : CsrCause::ILLEGAL_INSTRUCTION,
        @<b>|expt_trap_return_priv  : CsrCause::ILLEGAL_INSTRUCTION,|
        default                : 0,
    };
#@end
//}

== ECALL命令のcauseを変更する

M-modeでECALL命令を実行するとEnvironment call from M-mode例外が発生します。
これに対してU-modeでECALL命令を実行するとEnvironment call from U-mode例外が発生します。
特権レベルと例外の対応は@<table>{ecall.cause.table}のようになっています。

//table[ecall.cause.table][ECALL命令を実行したときに発生する例外]{
特権レベル	例外							cause
--------------------------------------------------------------
M-mode		Environment call from M-mode	11
S-mode		Environment call from S-mode	9
U-mode		Environment call from U-mode	8
//}

ここで各例外のcauseがU-modeのcauseに特権レベルの数値を足したものになっていることを利用します。
@<code>{CsrCause}型にEnvironment call from U-mode例外のcauseを追加します
(
@<list>{eei.veryl.ecallm.CsrCause}
)。

//list[eei.veryl.ecallm.CsrCause][CsrCause型に例外のcauseを追加する (eei.veryl)]{
#@maprange(scripts/22/ecallm-range/core/src/eei.veryl,CsrCause)
        STORE_AMO_ADDRESS_MISALIGNED = 6,
        @<b>|ENVIRONMENT_CALL_FROM_U_MODE = 8,|
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
#@end
//}

csrunitモジュールの@<code>{mode}レジスタをポート宣言に移動し、
IDステージでECALL命令をデコードするときにcauseに@<code>{mode}を足します
(
@<list>{csrunit.veryl.ecallm.port}、
@<list>{core.veryl.ecallm.reg}、
@<list>{core.veryl.ecallm.port}、
@<list>{core.veryl.ecallm.expt}
)。

//list[csrunit.veryl.ecallm.port][modeレジスタをポートに移動する (csrunit.veryl)]{
#@maprange(scripts/22/ecallm-range/core/src/csrunit.veryl,port)
    rdata      : output  UIntX               ,
    @<b>|mode       : output  PrivMode            ,|
    raise_trap : output  logic               ,
#@end
//}

//list[core.veryl.ecallm.reg][csrunitから現在の特権レベルを受け取る変数 (core.veryl)]{
#@maprange(scripts/22/ecallm-range/core/src/core.veryl,reg)
    var csru_priv_mode  : PrivMode;
#@end
//}

//list[core.veryl.ecallm.port][csrunitモジュールのインスタンスから現在の特権レベルを受け取る (core.veryl)]{
#@maprange(scripts/22/ecallm-range/core/src/core.veryl,port)
        rdata      : csru_rdata           ,
        @<b>|mode       : csru_priv_mode       ,|
        raise_trap : csru_raise_trap      ,
#@end
//}

//list[core.veryl.ecallm.expt][Environment call from U-mode例外のcauseに特権レベルの数値を足す (core.veryl)]{
#@maprange(scripts/22/ecallm-range/core/src/core.veryl,expt)
        } else if ids_inst_bits == 32'h00000073 {
            // ECALL
            exq_wdata.expt.valid      = 1;
            exq_wdata.expt.cause      = @<b>|CsrCause::ENVIRONMENT_CALL_FROM_U_MODE;|
            @<b>|exq_wdata.expt.cause[1:0] = csru_priv_mode;|
            exq_wdata.expt.value      = 0;
#@end
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

現在の特権レベルによって割り込みが発生する条件を切り替えます。
U-modeのときはmstatus.MIEを考慮しないようにします
(@<list>{csrunit.veryl.intr.raise_interrupt})。

//list[csrunit.veryl.intr.raise_interrupt][U-modeのとき、割り込みの発生条件を変更する (csrunit.veryl)]{
#@maprange(scripts/22/intr-range/core/src/csrunit.veryl,raise_interrupt)
    let raise_interrupt  : logic = valid && can_intr && @<b>{(mode != PrivMode::M ||} mstatus_mie@<b>{)} && interrupt_pending != 0;
#@end
//}
