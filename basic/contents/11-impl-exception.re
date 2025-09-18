= 例外の実装

== 例外とは何か?

CPUがソフトウェアを実行するとき、
処理を中断したり終了しなければならないような異常な状態@<fn>{unusual-condition}が発生することがあります。
例えば、実行環境(EEI)がサポートしていない、
または実行を禁止しているような違法(illegal)@<fn>{illegal}な命令を実行しようとする場合です。
このとき、CPUはどのような動作をすればいいのでしょうか？

//footnote[unusual-condition][異常な状態(unusual condition)。予期しない(unexpected)事象と呼ぶ場合もあります。]

//footnote[illegal][不正と呼ぶこともあります。逆に実行できる命令のことを合法(legal)な命令と呼びます]

RISC-Vでは、命令によって引き起こされる異常な状態のことを@<b>{例外(Exception)}と呼び、
例外が発生した場合には@<b>{トラップ(Trap)}を引き起こします。
トラップとは例外、または割り込み(Interrupt)@<fn>{interrupt}によってCPUの状態、制御を変更することです。
具体的にはPCをトラップベクタ(trap vector)に移動したり、CSRを変更します。

//footnote[interrupt][割り込みは@<chapref>{21-impl-interrupt}で実装します。]

本書では既にECALL命令の実行によって発生するEnvironment call from M-mode例外を実装しており、
例外が発生したら次のように動作します。

 1. mcauseレジスタにトラップの発生原因を示す値(@<code>{11})を書き込む
 2. mepcレジスタにPCの値を書き込む
 3. PCをmtvecレジスタの値に設定する

本章では、例外発生時に例外に固有の情報を書き込むmtvalレジスタと、現在の実装で発生する可能性がある例外を実装します。
本書ではこれ以降、トラップの発生原因を示す値のことをcauseと呼びます。

== 例外情報の伝達

=== Environment call from M-mode例外をIFステージで処理する

今のところ、ECALL命令による例外はMEM(CSR)ステージのcsrunitモジュールで例外判定、処理されています。
ECALL命令によって例外が発生するかは命令がECALLであるかどうかだけを判定すれば分かるため、
命令をデコードする時点、つまりIDステージで判定できます。

本章で実装する例外にはMEMステージよりも前で発生する例外があるため、
IDステージから順に次のステージに例外の有無、causeを受け渡していく仕組みを実装します。

まず、例外が発生するかどうか(@<code>{valid})、例外のcause(@<code>{cause})をまとめた@<code>{ExceptionInfo}構造体を定義します
(@<list>{corectrl.veryl.exptinfo-range.ExceptionInfo})。

//list[corectrl.veryl.exptinfo-range.ExceptionInfo][ExceptionInfo構造体を定義する (corectrl.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/corectrl.veryl,ExceptionInfo)
    // 例外の情報を保存するための型
    struct ExceptionInfo {
        valid: logic   ,
        cause: CsrCause,
    }
#@end
//}

EXステージ、MEMステージのFIFOのデータ型に構造体を追加します
(@<list>{core.veryl.exptinfo-range.exq_type}、@<list>{core.veryl.exptinfo-range.memq_type})。

//list[core.veryl.exptinfo-range.exq_type][EXステージのFIFOにExceptionInfoを追加する (core.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/core.veryl,exq_type)
    struct exq_type {
        addr: Addr         ,
        bits: Inst         ,
        ctrl: InstCtrl     ,
        imm : UIntX        ,
        @<b>|expt: ExceptionInfo,|
    }
#@end
//}

//list[core.veryl.exptinfo-range.memq_type][MEMステージのFIFOにExceptionInfoを追加する (core.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/core.veryl,memq_type)
    struct memq_type {
        addr      : Addr            ,
        bits      : Inst            ,
        ctrl      : InstCtrl        ,
        imm       : UIntX           ,
        @<b>|expt      : ExceptionInfo   ,|
        alu_result: UIntX           ,
        rs1_addr  : logic        <5>,
#@end
//}

IDステージからEXステージに命令を渡すとき、
命令がECALL命令なら例外が発生することを伝えます
(@<list>{core.veryl.exptinfo-range.idex})。

//list[core.veryl.exptinfo-range.idex][IDステージでECALL命令を判定する (core.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/core.veryl,idex)
    always_comb {
        // ID -> EX
        if_fifo_rready = exq_wready;
        exq_wvalid     = if_fifo_rvalid;
        exq_wdata.addr = if_fifo_rdata.addr;
        exq_wdata.bits = if_fifo_rdata.bits;
        exq_wdata.ctrl = ids_ctrl;
        exq_wdata.imm  = ids_imm;
        @<b>|// exception|
        @<b>|exq_wdata.expt.valid = ids_inst_bits == 32'h00000073; // ECALL|
        @<b>|exq_wdata.expt.cause = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;|
    }
#@end
//}

EXステージで例外は発生しないので、
例外情報をそのままMEMステージに渡します
(@<list>{core.veryl.exptinfo-range.exmem})。

//list[core.veryl.exptinfo-range.exmem][EXステージからMEMステージに例外情報を渡す (core.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/core.veryl,exmem)
    always_comb {
        // EX -> MEM
        exq_rready            = memq_wready && !exs_stall;
        ...
        memq_wdata.jump_addr  = if inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result & ~1;
        @<b>|memq_wdata.expt       = exq_rdata.expt;|
    }
#@end
//}

csrunitモジュールを変更します。
@<code>{expt_info}ポートを追加して、MEMステージ以前の例外情報を受け取ります
(
@<list>{csrunit.veryl.exptinfo-range.port}、
@<list>{core.veryl.exptinfo-range.memreg}、
@<list>{core.veryl.exptinfo-range.csru}
)。

//list[csrunit.veryl.exptinfo-range.port][csrunitモジュールに例外情報を受け取るためのポートを追加する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/csrunit.veryl,port)
module csrunit (
    clk        : input  clock            ,
    rst        : input  reset            ,
    valid      : input  logic            ,
    pc         : input  Addr             ,
    ctrl       : input  InstCtrl         ,
    @<b>|expt_info  : input  ExceptionInfo    ,|
    rd_addr    : input  logic        <5> ,
#@end
//}

//list[core.veryl.exptinfo-range.memreg][MEMステージの例外情報の変数を作成する (core.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/core.veryl,memreg)
    ///////////////////////////////// MEM Stage /////////////////////////////////
    var mems_is_new   : logic           ;
    let mems_valid    : logic            = memq_rvalid;
    let mems_pc       : Addr             = memq_rdata.addr;
    let mems_inst_bits: Inst             = memq_rdata.bits;
    let mems_ctrl     : InstCtrl         = memq_rdata.ctrl;
    @<b>|let mems_expt     : ExceptionInfo    = memq_rdata.expt;|
    let mems_rd_addr  : logic        <5> = mems_inst_bits[11:7];
#@end
//}

//list[core.veryl.exptinfo-range.csru][csrunitモジュールに例外情報を供給する (core.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/core.veryl,csru)
    inst csru: csrunit (
        clk                             ,
        rst                             ,
        valid    : mems_valid           ,
        pc       : mems_pc              ,
        ctrl     : mems_ctrl            ,
        @<b>|expt_info: mems_expt            ,|
        rd_addr  : mems_rd_addr         ,
#@end
//}

ECALL命令かどうかを判定する@<code>{is_ecall}変数を削除して、
例外の発生条件、例外の種類を示す値を変更します
(
@<list>{csrunit.veryl.exptinfo-range.remove_ecall}、
@<list>{csrunit.veryl.exptinfo-range.expt}
)。

//list[csrunit.veryl.exptinfo-range.remove_ecall][csrunitモジュールでのECALL命令の判定を削除する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/csrunit.veryl,remove_ecall)
    // CSRR(W|S|C)[I]命令かどうか
    let is_wsc: logic = ctrl.is_csr && ctrl.funct3[1:0] != 0;
    @<del>|// ECALL命令かどうか|
    @<del>|let is_ecall: logic = ctrl.is_csr && csr_addr == 0 && rs1[4:0] == 0 && ctrl.funct3 == 0 && rd_addr == 0;|
#@end
//}

//list[csrunit.veryl.exptinfo-range.expt][ExceptionInfoを使って例外を起こす (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/exptinfo-range/core/src/csrunit.veryl,expt)
    // Exception
    let raise_expt: logic = valid && expt_info.valid;
    let expt_cause: UIntX = expt_info.cause;
#@end
//}

=== mtvalレジスタを実装する

例外が発生すると、CPUはトラップベクタにジャンプして例外を処理します。
mcauseレジスタを読むことでどの例外が発生したかを判別できますが、
その例外の詳しい情報を知りたいことがあります。

//image[mtval][mtvalレジスタ][width=90%]

RISC-Vには、例外が発生したときのソフトウェアによるハンドリングを補助するために、
MXLENビットのmtvalレジスタが定義されています(@<img>{mtval})。
例外が発生したとき、CPUはmtvalレジスタに例外に固有の情報を書き込みます。
これ以降、例外に固有の情報のことをtvalと呼びます。

@<code>{ExceptionInfo}構造体に例外に固有の情報を示す@<code>{value}を追加します
(@<list>{corectrl.veryl.mtval-range.ExceptionInfo})。

//list[corectrl.veryl.mtval-range.ExceptionInfo][tvalをExceptionInfoに追加する (corectrl.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/corectrl.veryl,ExceptionInfo)
    struct ExceptionInfo {
        valid: logic   ,
        cause: CsrCause,
        @<b>|value: UIntX   ,|
    }
#@end
//}

ECALL命令はmtvalに書き込むような情報がないので@<code>{0}に設定します
(@<list>{core.veryl.mtval-range.idex})。

//list[core.veryl.mtval-range.idex][ECALL命令のtvalを設定する (corectrl.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/core.veryl,idex)
        // exception
        exq_wdata.expt.valid = ids_inst_bits == 32'h00000073; // ECALL
        exq_wdata.expt.cause = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;
        @<b>|exq_wdata.expt.value = 0;|
#@end
//}

@<code>{CsrAddr}型にmtvalレジスタのアドレスを追加します
(@<list>{eei.veryl.mtval-range.CsrAddr})。

//list[eei.veryl.mtval-range.CsrAddr][mtvalのアドレスを定義する (eei.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/eei.veryl,CsrAddr)
    enum CsrAddr: logic<12> {
        MTVEC = 12'h305,
        MEPC = 12'h341,
        MCAUSE = 12'h342,
        @<b>|MTVAL = 12'h343,|
        LED = 12'h800,
    }
#@end
//}

mtvalレジスタを実装して、書き込み、読み込みできるようにします
(
@<list>{csrunit.veryl.mtval-range.wmask}、
@<list>{csrunit.veryl.mtval-range.reg}、
@<list>{csrunit.veryl.mtval-range.rw}、
@<list>{csrunit.veryl.mtval-range.reset}、
@<list>{csrunit.veryl.mtval-range.write}
)。

//list[csrunit.veryl.mtval-range.wmask][mtvalの書き込みマスクを定義する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,wmask)
    const MTVAL_WMASK : UIntX = 'hffff_ffff_ffff_ffff;
#@end
//}

//list[csrunit.veryl.mtval-range.reg][mtvalレジスタを作成する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,reg)
    var mtvec : UIntX;
    var mepc  : UIntX;
    var mcause: UIntX;
    @<b>|var mtval : UIntX;|
#@end
//}

//list[csrunit.veryl.mtval-range.rw][mtvalの読み込みデータ、書き込みマスクを設定する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,rw)
    always_comb {
        // read
        rdata = case csr_addr {
            ...
            @<b>|CsrAddr::MTVAL : mtval,|
            ...
        };
        // write
        wmask = case csr_addr {
            ...
            @<b>|CsrAddr::MTVAL : MTVAL_WMASK,|
            ...
        };
#@end
//}

//list[csrunit.veryl.mtval-range.reset][mtvalレジスタをリセットする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,reset)
    always_ff {
        if_reset {
            mtvec  = 0;
            mepc   = 0;
            mcause = 0;
            @<b>|mtval  = 0;|
            led    = 0;
#@end
//}

//list[csrunit.veryl.mtval-range.write][mtvalに書き込めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,write)
    } else {
        if is_wsc {
            case csr_addr {
                ...
                @<b>|CsrAddr::MTVAL : mtval  = wdata;|
                ...
            }
        }
    }
#@end
//}

例外が発生するとき、mtvalレジスタに@<code>{expt_info.value}を書き込むようにします
(
@<list>{csrunit.veryl.mtval-range.info}、
@<list>{csrunit.veryl.mtval-range.update}
)。

//list[csrunit.veryl.mtval-range.info][tvalを変数に割り当てる (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,info)
    let raise_expt: logic = valid && expt_info.valid;
    let expt_cause: UIntX = expt_info.cause;
    @<b>|let expt_value: UIntX = expt_info.value;|
#@end
//}

//list[csrunit.veryl.mtval-range.update][例外が発生するとき、mtvalにtvalを書き込む (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/mtval-range/core/src/csrunit.veryl,update)
    if valid {
        if raise_trap {
            if raise_expt {
                mepc   = pc;
                mcause = trap_cause;
                @<b>|mtval  = expt_value;|
            }
#@end
//}

== Breakpoint例外の実装

Breakpoint例外は、EBREAK命令によって引き起こされる例外です。
EBREAK命令はデバッガがプログラムを中断させる場合などに利用されます。
EBREAK命令はECALL命令と同様に例外を発生させるだけで、ほかに操作を行いません。
causeは@<code>{3}で、tvalは例外が発生した命令のアドレスになります。

@<code>{CsrCause}型にBreakpoint例外のcauseを追加します
(@<list>{eei.veryl.breakpoint-range.CsrCause})。

//list[eei.veryl.breakpoint-range.CsrCause][Breakpoint例外のcauseを定義する (eei.veryl)][lineno=on]{
#@maprange(scripts/11/breakpoint-range/core/src/eei.veryl,CsrCause)
    enum CsrCause: UIntX {
        BREAKPOINT = 3,
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
    }
#@end
//}

IDステージでEBREAK命令を判定して、tvalにPCを設定します
(@<list>{core.veryl.breakpoint-range.idex})。

//list[core.veryl.breakpoint-range.idex][IDステージでEBREAK命令を判定する (core.veryl)][lineno=on]{
#@maprange(scripts/11/breakpoint-range/core/src/core.veryl,idex)
        exq_wdata.expt = 0;
        @<b>|if ids_inst_bits == 32'h00000073 {|
            // ECALL
            exq_wdata.expt.valid = @<b>|1;|
            exq_wdata.expt.cause = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;
            exq_wdata.expt.value = 0;
        @<b>|} else if ids_inst_bits == 32'h00100073 {|
            @<b>|// EBREAK|
            @<b>|exq_wdata.expt.valid = 1;|
            @<b>|exq_wdata.expt.cause = CsrCause::BREAKPOINT;|
            @<b>|exq_wdata.expt.value = ids_pc;|
        @<b>|}|
#@end
//}

== Illegal instruction例外の実装

Illegal instruction例外は、
現在の環境で実行できない命令を実行しようとしたときに発生する例外です。
causeは@<code>{2}で、tvalは例外が発生した命令のビット列になります。

本章では、
EEIが認識できない不正な命令ビット列を実行しようとした場合と、
読み込み専用のCSRに書き込もうとした場合の2つの状況で例外を発生させます。

=== 不正な命令ビット列で例外を起こす

CPUに実装していない命令、つまりデコードできない命令を実行しようとするとき、
Illegal instruction例外が発生します。

今のところ未知の命令は何もしない命令として実行しています。
ここで、inst_decoderモジュールを、未知の命令であることを報告するように変更します。

inst_decoderモジュールに、命令が有効かどうかを示す@<code>{valid}ポートを追加します
(
@<list>{inst_decoder.veryl.instillegal-range.port}、
@<list>{core.veryl.instillegal-range.ids}
)。

//list[inst_decoder.veryl.instillegal-range.port][validポートを追加する (inst_decoder.veryl)][lineno=on]{
#@maprange(scripts/11/instillegal-range/core/src/inst_decoder.veryl,port)
module inst_decoder (
    bits : input  Inst    ,
    @<b>|valid: output logic   ,|
    ctrl : output InstCtrl,
    imm  : output UIntX   ,
) {
#@end
//}

//list[core.veryl.instillegal-range.ids][inst_decoderモジュールのvalidポートと変数を接続する (core.veryl)][lineno=on]{
#@maprange(scripts/11/instillegal-range/core/src/core.veryl,ids)
    let ids_valid     : logic    = if_fifo_rvalid;
    let ids_pc        : Addr     = if_fifo_rdata.addr;
    let ids_inst_bits : Inst     = if_fifo_rdata.bits;
    @<b>|var ids_inst_valid: logic   ;|
    var ids_ctrl      : InstCtrl;
    var ids_imm       : UIntX   ;

    inst decoder: inst_decoder (
        bits : ids_inst_bits ,
        @<b>|valid: ids_inst_valid,|
        ctrl : ids_ctrl      ,
        imm  : ids_imm       ,
    );
#@end
//}

今のところ実装してある命令を有効な命令として判定する処理をalways_combブロックに記述します
(@<list>{inst_decoder.veryl.instillegal-range.valid})。

//list[inst_decoder.veryl.instillegal-range.valid][命令の有効判定を行う (inst_decoder.veryl)][lineno=on]{
#@maprange(scripts/11/instillegal-range/core/src/inst_decoder.veryl,valid)
        valid = case op {
            OP_LUI, OP_AUIPC, OP_JAL, OP_JALR: T,
            OP_BRANCH                        : f3 != 3'b010 && f3 != 3'b011,
            OP_LOAD                          : f3 != 3'b111,
            OP_STORE                         : f3[2] == 1'b0,
            OP_OP                            : case f7 {
                7'b0000000: T, // RV32I
                7'b0100000: f3 == 3'b000 || f3 == 3'b101, // SUB, SRA
                7'b0000001: T, // RV32M
                default   : F,
            },
            OP_OP_IMM: case f3 {
                3'b001 : f7[6:1] == 6'b000000, // SLLI (RV64I)
                3'b101 : f7[6:1] == 6'b000000 || f7[6:1] == 6'b010000, // SRLI, SRAI (RV64I)
                default: T,
            },
            OP_OP_32: case f7 {
                7'b0000001: f3 == 3'b000 || f3[2] == 1'b1, // RV64M
                7'b0000000: f3 == 3'b000 || f3 == 3'b001 || f3 == 3'b101, // ADDW, SLLW, SRLW
                7'b0100000: f3 == 3'b000 || f3 == 3'b101, // SUBW, SRAW
                default   : F,
            },
            OP_OP_IMM_32: case f3 {
                3'b000 : T, // ADDIW
                3'b001 : f7 == 7'b0000000, // SLLIW
                3'b101 : f7 == 7'b0000000 || f7 == 7'b0100000, // SRLIW, SRAIW
                default: F,
            },
            OP_SYSTEM: f3 != 3'b000 && f3 != 3'b100 || // CSRR(W|S|C)[I]
             bits == 32'h00000073 || // ECALL
             bits == 32'h00100073 || // EBREAK
             bits == 32'h30200073, //MRET
            OP_MISC_MEM: T, // FENCE
            default    : F,
        };
#@end
//}

riscv-testsでメモリ読み書きの順序を保証するFENCE命令@<fn>{memory.order}を使用しているため、
opcodeがOP-MISCである命令を合法な命令として取り扱っています。
OP-MISCのopcode(@<code>{7'b0001111})をeeiパッケージに定義してください
(@<list>{eei.veryl.instillegal-range.op})。

//list[eei.veryl.instillegal-range.op][OP-MISCのビット列を定義する (eei.veryl)][lineno=on]{
#@maprange(scripts/11/instillegal-range/core/src/eei.veryl,op)
    const OP_MISC_MEM : logic<7> = 7'b0001111;
#@end
//}

//footnote[memory.order][基本編で実装するCPUはロードストア命令を直列に実行するため順序を保証する必要がありません。そのためFENCE命令は何もしない命令として扱います。]

@<code>{CsrCause}型にIllegal instruction例外のcauseを追加します
(@<list>{eei.veryl.instillegal-range.CsrCause})。

#@# mapにする
//list[eei.veryl.instillegal-range.CsrCause][Illegal instruction例外のcauseを定義する (eei.veryl)][lineno=on]{
#@# maprange(scripts/11/instillegal-range/core/src/eei.veryl,CsrCause)
    enum CsrCause: UIntX {
        @<b>|ILLEGAL_INSTRUCTION = 2,|
        BREAKPOINT = 3,
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
    }
#@# end
//}

@<code>{valid}フラグを利用して、IDステージでIllegal instruction例外を発生させます
(@<list>{core.veryl.instillegal-range.idex})。
tvalには、命令を右に詰めてゼロで拡張した値を設定します。

//list[core.veryl.instillegal-range.idex][不正な命令のとき、例外を発生させる (core.veryl)][lineno=on]{
#@maprange(scripts/11/instillegal-range/core/src/core.veryl,idex)
        exq_wdata.expt = 0;
        @<b>|if !ids_inst_valid {|
            @<b>|// illegal instruction|
            @<b>|exq_wdata.expt.valid = 1;|
            @<b>|exq_wdata.expt.cause = CsrCause::ILLEGAL_INSTRUCTION;|
            @<b>|exq_wdata.expt.value = {1'b0 repeat XLEN - ILEN, ids_inst_bits};|
        @<b>|} else| if ids_inst_bits == 32'h00000073 {
#@end
//}

=== 読み込み専用のCSRへの書き込みで例外を起こす

RISC-VのCSRには読み込み専用のレジスタが存在しており、
アドレスの上位2ビットが@<code>{2'b11}のCSRが読み込み専用として定義されています。
読み込み専用のCSRに書き込みを行おうとするとIllegal instruction例外が発生します。

CSRに値が書き込まれるのは次のいずれかの場合です。
読み書き可能なレジスタ内の読み込み専用のフィールドへの書き込みは例外を引き起こしません。

 1. CSRRW、CSRRWI命令である
 2. CSRRS命令でrs1が0番目のレジスタ以外である
 3. CSRRSI命令で即値が@<code>{0}以外である
 4. CSRRC命令でrs1が0番目のレジスタ以外である
 5. CSRRCI命令で即値が@<code>{0}以外である

ソースレジスタの値が@<code>{0}だとしても、0番目のレジスタではない場合にはCSRに書き込むと判断します。
CSRに書き込むかどうかを正しく判定するために、
csrunitモジュールの@<code>{rs1}ポートを@<code>{rs1_addr}と@<code>{rs1_data}に分解します
(
@<list>{core.veryl.csrro-range.csru}、
@<list>{csrunit.veryl.csrro-range.port}、
@<list>{csrunit.veryl.csrro-range.wdata}
)@<fn>{fix-wmask-bug}。
また、causeを設定するためにcsrunitモジュールに命令のビット列を供給します。


//list[csrunit.veryl.csrro-range.port][csrunitモジュールのポート定義を変更する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/csrunit.veryl,port)
module csrunit (
    clk        : input  clock            ,
    rst        : input  reset            ,
    valid      : input  logic            ,
    pc         : input  Addr             ,
    @<b>|inst_bits  : input  Inst             ,|
    ctrl       : input  InstCtrl         ,
    expt_info  : input  ExceptionInfo    ,
    rd_addr    : input  logic        <5> ,
    csr_addr   : input  logic        <12>,
    @<b>|rs1_addr   : input  logic        <5> ,|
    @<b>|rs1_data   : input  UIntX            ,|
    rdata      : output UIntX            ,
    raise_trap : output logic            ,
    trap_vector: output Addr             ,
    led        : output UIntX            ,
) {
#@end
//}

//list[core.veryl.csrro-range.csru][csrunitモジュールのポート定義を変更する (core.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/core.veryl,csru)
    inst csru: csrunit (
        clk                               ,
        rst                               ,
        valid      : mems_valid           ,
        pc         : mems_pc              ,
        @<b>|inst_bits  : mems_inst_bits       ,|
        ctrl       : mems_ctrl            ,
        expt_info  : mems_expt            ,
        rd_addr    : mems_rd_addr         ,
        csr_addr   : @<b>|mems_inst_bits[31:20],|
        @<b>|rs1_addr   : memq_rdata.rs1_addr  ,|
        @<b>|rs1_data   : memq_rdata.rs1_data  ,|
        rdata      : csru_rdata           ,
        raise_trap : csru_raise_trap      ,
        trap_vector: csru_trap_vector     ,
        led                               ,
    );
#@end
//}

//list[csrunit.veryl.csrro-range.wdata][rs1の変更に対応する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/csrunit.veryl,wdata)
    @<b>|let wsource: UIntX = if ctrl.funct3[2] ? {1'b0 repeat XLEN - 5, rs1_addr} : rs1_data;|
    wdata   = case ctrl.funct3[1:0] {
        2'b01  : @<b>|wsource|,
        2'b10  : rdata | @<b>|wsource|,
        2'b11  : rdata & ~@<b>|wsource|,
        default: 'x,
    } & wmask | (rdata & ~wmask);
#@end
//}

//footnote[fix-wmask-bug][基本編 第1部の初版の@<code>{wdata}の生成ロジックに間違いがあったので訂正してあります。]

命令のfunct3とrs1のアドレスを利用して、書き込み先が読み込み専用レジスタかどうかを判定します@<fn>{it-can-be-id}
(@<list>{csrunit.veryl.csrro-range.check})。
また、命令のビット列を利用できるようになったので、MRET命令の判定を命令のビット列の比較に書き換えています。

//list[csrunit.veryl.csrro-range.check][読み込み専用CSRへの書き込みが発生するか判定する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/csrunit.veryl,check)
    // CSRR(W|S|C)[I]命令かどうか
    let is_wsc: logic = ctrl.is_csr && ctrl.funct3[1:0] != 0;
    // MRET命令かどうか
    let is_mret: logic = inst_bits == 32'h30200073;

    // Check CSR access
    let will_not_write_csr     : logic = (ctrl.funct3[1:0] == 2 || ctrl.funct3[1:0] == 3) && rs1_addr == 0; // set/clear with source = 0
    let expt_write_readonly_csr: logic = is_wsc && !will_not_write_csr && csr_addr[11:10] == 2'b11; // attempt to write read-only CSR
#@end
//}

//footnote[it-can-be-id][IDステージで判定することもできます。]

例外が発生するとき、causeとtvalを設定します
(@<list>{csrunit.veryl.csrro-range.expt})。

//list[csrunit.veryl.csrro-range.expt][読み込み専用CSRの書き込みで例外を発生させる (csrunit.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/csrunit.veryl,expt)
    let raise_expt: logic = valid && (expt_info.valid || expt_write_readonly_csr);
    let expt_cause: UIntX = @<b>|switch {|
        @<b>|expt_info.valid        :| expt_info.cause@<b>|,|
        @<b>|expt_write_readonly_csr: CsrCause::ILLEGAL_INSTRUCTION,|
        @<b>|default                : 0,|
    @<b>|}|;
    let expt_value: UIntX = @<b>|switch {|
        @<b>|expt_info.valid                            :| expt_info.value@<b>|,|
        @<b>|expt_cause == CsrCause::ILLEGAL_INSTRUCTION: {1'b0 repeat XLEN - $bits(Inst), inst_bits},|
        @<b>|default                                    : 0|
    @<b>|}|;
#@end
//}

この変更により、レジスタにライトバックするようにデコードされた命令が
csrunitモジュールでトラップを起こすようになりました。
トラップが発生するときにWBステージでライトバックしないように変更します
(
@<list>{core.veryl.csrro-range.wbq_type}、
@<list>{core.veryl.csrro-range.memwb}、
@<list>{core.veryl.csrro-range.wb}
)。

//list[core.veryl.csrro-range.wbq_type][トラップが発生したかを示すlogicをwbq_typeに追加する (core.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/core.veryl,wbq_type)
    struct wbq_type {
        ...
        csr_rdata : UIntX   ,
        @<b>|raise_trap: logic   ,|
    }
#@end
//}

//list[core.veryl.csrro-range.memwb][トラップが発生したかをWBステージに伝える (core.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/core.veryl,memwb)
    wbq_wdata.raise_trap = csru_raise_trap;
#@end
//}

//list[core.veryl.csrro-range.wb][トラップが発生しているとき、レジスタにデータを書き込まないようにする (core.veryl)][lineno=on]{
#@maprange(scripts/11/csrro-range/core/src/core.veryl,wb)
    always_ff {
        if wbs_valid && wbs_ctrl.rwb_en && !wbq_rdata.raise_trap {
            regfile[wbs_rd_addr] = wbs_wb_data;
        }
    }
#@end
//}

=={def-ialign} 命令アドレスのミスアライン例外

RISC-Vでは、命令アドレスがIALIGNビット境界に整列されていない場合に
Instruction address misaligned例外が発生します。
causeは@<code>{0}で、tvalは命令のアドレスになります。

@<chapref>{14-impl-c}で実装するC拡張が実装されていない場合、
IALIGNは@<code>{32}と定義されています。
C拡張が定義されている場合は@<code>{16}になります。

IALIGNビット境界に整列されていない命令アドレスになるのはジャンプ命令、分岐命令を実行する場合です@<fn>{epc-tvec-mask}。
PCの遷移先が整列されていない場合に例外が発生します。
分岐命令の場合、分岐が成立する場合にしか例外は発生しません。

//footnote[epc-tvec-mask][mepc、mtvecはIALIGNビットに整列されたアドレスしか書き込めないため、遷移先のアドレスは常に整列されています。]

@<code>{CsrCause}型にInstruction address misaligned例外のcauseを追加します
(@<list>{core.veryl.instmisalign-range.CsrCause})。

//list[core.veryl.instmisalign-range.CsrCause][Instruction address misaligned例外のcauseを定義する (eei.veryl)][lineno=on]{
#@maprange(scripts/11/instmisalign-range/core/src/eei.veryl,CsrCause)
    enum CsrCause: UIntX {
        @<b>|INSTRUCTION_ADDRESS_MISALIGNED = 0,|
        ILLEGAL_INSTRUCTION = 2,
        BREAKPOINT = 3,
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
    }
#@end
//}

EXステージでアドレスを確認して例外を判定します
(@<list>{core.veryl.instmisalign-range.exmem})。
tvalは遷移先のアドレスになることに注意してください。

//list[core.veryl.instmisalign-range.exmem][EXステージでInstruction address misaligned例外の判定を行う (core.veryl)][lineno=on]{
#@maprange(scripts/11/instmisalign-range/core/src/core.veryl,exmem)
        memq_wdata.jump_addr  = if inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result & ~1;
        // exception
        @<b>|let instruction_address_misaligned: logic = memq_wdata.br_taken && memq_wdata.jump_addr[1:0] != 2'b00;|
        memq_wdata.expt                = exq_rdata.expt;
        @<b>|if !memq_rdata.expt.valid {|
        @<b>|    if instruction_address_misaligned {|
        @<b>|        memq_wdata.expt.valid = 1;|
        @<b>|        memq_wdata.expt.cause = CsrCause::INSTRUCTION_ADDRESS_MISALIGNED;|
        @<b>|        memq_wdata.expt.value = memq_wdata.jump_addr;|
        @<b>|    }|
        @<b>|}|
#@end
//}

== ロードストア命令のミスアライン例外

RISC-Vでは、ロード、ストア命令でアクセスするメモリのアドレスが、
ロード、ストアするビット幅に整列されていない場合に、
それぞれLoad address misaligned例外、Store/AMO address misaligned例外が発生します@<fn>{enable-misalign}。
例えばLW命令は4バイトに整列されたアドレス、LD命令は8バイトに整列されたアドレスにしかアクセスできません。
causeはそれぞれ@<code>{4}、@<code>{6}で、tvalはアクセスするメモリのアドレスになります。

//footnote[enable-misalign][例外を発生させず、そのようなメモリアクセスをサポートすることもできます。本書ではCPUを単純に実装するために例外とします。]

@<code>{CsrCause}型に例外のcauseを追加します
(@<list>{eei.veryl.memmisalign-range.CsrCause})。

//list[eei.veryl.memmisalign-range.CsrCause][例外のcauseを定義する (eei.veryl)][lineno=on]{
#@maprange(scripts/11/memmisalign-range/core/src/eei.veryl,CsrCause)
    enum CsrCause: UIntX {
        INSTRUCTION_ADDRESS_MISALIGNED = 0,
        ILLEGAL_INSTRUCTION = 2,
        BREAKPOINT = 3,
        @<b>|LOAD_ADDRESS_MISALIGNED = 4,|
        @<b>|STORE_AMO_ADDRESS_MISALIGNED = 6,|
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
    }
#@end
//}

EXステージでアドレスを確認して例外を判定します
(@<list>{core.veryl.memmisalign-range.expt})。

//list[core.veryl.memmisalign-range.expt][EXステージで例外の判定を行う (core.veryl)][lineno=on]{
#@maprange(scripts/11/memmisalign-range/core/src/core.veryl,expt)
        let instruction_address_misaligned: logic = memq_wdata.br_taken && memq_wdata.jump_addr[1:0] != 2'b00;
        @<b>|let loadstore_address_misaligned  : logic = inst_is_memop(exs_ctrl) && case exs_ctrl.funct3[1:0] {|
        @<b>|    2'b00  : 0, // B|
        @<b>|    2'b01  : exs_alu_result[0] != 1'b0, // H|
        @<b>|    2'b10  : exs_alu_result[1:0] != 2'b0, // W|
        @<b>|    2'b11  : exs_alu_result[2:0] != 3'b0, // D|
        @<b>|    default: 0,|
        @<b>|};|
        memq_wdata.expt = exq_rdata.expt;
        if !memq_rdata.expt.valid {
            if instruction_address_misaligned {
                memq_wdata.expt.valid = 1;
                memq_wdata.expt.cause = CsrCause::INSTRUCTION_ADDRESS_MISALIGNED;
                memq_wdata.expt.value = memq_wdata.jump_addr;
            @<b>|} else if loadstore_address_misaligned {|
            @<b>|    memq_wdata.expt.valid = 1;|
            @<b>|    memq_wdata.expt.cause = if exs_ctrl.is_load ? CsrCause::LOAD_ADDRESS_MISALIGNED : CsrCause::STORE_AMO_ADDRESS_MISALIGNED;|
            @<b>|    memq_wdata.expt.value = exs_alu_result;|
            }
        }
#@end
//}

例外が発生するときにmemunitモジュールが動作しないようにします
(@<list>{core.veryl.memmisalign-range.memu})。

//list[core.veryl.memmisalign-range.memu][例外が発生するとき、memunitのvalidを0にする (core.veryl)][lineno=on]{
#@maprange(scripts/11/memmisalign-range/core/src/core.veryl,memu)
    inst memu: memunit (
        clk                                   ,
        rst                                   ,
        valid : mems_valid @<b>|&& !mems_expt.valid|,
        is_new: mems_is_new                   ,
        ctrl  : mems_ctrl                     ,
        addr  : memq_rdata.alu_result         ,
        rs2   : memq_rdata.rs2_data           ,
        rdata : memu_rdata                    ,
        stall : memu_stall                    ,
        membus: d_membus                      ,
    );
#@end
//}

