= M拡張の実装

//abstract{
//}

== 概要

「第I部 RV32I / RV64Iの実装」ではRV64IのCPUを実装しました。
「第II部 RV64IMACの実装」では、次のような機能を実装します。

 * 乗算、除算、剰余演算命令 (M拡張)
 * 不可分操作命令 (A拡張)
 * 圧縮命令 (C拡張)
 * 例外
 * Memory-mapped I/O

本章では積、商、剰余を求める命令を実装します。
RISC-Vの乗算、除算、剰余演算を行う命令はM拡張に定義されており、
M拡張を実装したRV64IのISAのことを@<code>{RV64IM}と表記します。

M拡張には、XLENが@<code>{32}のときは@<table>{m.instructions.32}の命令が定義されています。
XLENが@<code>{64}のときは@<table>{m.instructions.64}の命令が定義されています。

//table[m.instructions.32][M拡張の命令 (XLEN=32)]{
命令	動作
-------------------------------------------------------------
MUL		rs1(符号付き) × rs2(符号付き)の結果(64ビット)の下位32ビットを求める
MULH	rs1(符号付き) × rs2(符号付き)の結果(64ビット)の上位32ビットを求める
MULHU	rs1(符号無し) × rs2(符号無し)の結果(64ビット)の上位32ビットを求める
MULHSU	rs1(符号付き) × rs2(符号無し)の結果(64ビット)の上位32ビットを求める
DIV		rs1(符号付き) / rs2(符号付き)を求める
DIVU	rs1(符号無し) / rs2(符号無し)を求める
REM		rs1(符号付き) % rs2(符号付き)を求める
REMU	rs1(符号無し) % rs2(符号無し)を求める
//}

//table[m.instructions.64][M拡張の命令 (XLEN=64)]{
命令	動作
-------------------------------------------------------------
MUL		rs1(符号付き) × rs2(符号付き)の結果(128ビット)の下位64ビットを求める
MULW	rs1[31:0](符号付き) × rs2[31:0](符号付き)の結果(64ビット)の下位32ビットを求める@<br>{}結果は符号拡張する
MULH	rs1(符号付き) × rs2(符号付き)の結果(128ビット)の上位64ビットを求める
MULHU	rs1(符号無し) × rs2(符号無し)の結果(128ビット)の上位64ビットを求める
MULHSU	rs1(符号付き) × rs2(符号無し)の結果(128ビット)の上位64ビットを求める
DIV		rs1(符号付き) / rs2(符号付き)を求める
DIVW	rs1[31:0](符号付き) / rs2[31:0](符号付き)を求める@<br>{}結果は符号拡張する
DIVU	rs1(符号無し) / rs2(符号無し)を求める
DIVWU	rs1[31:0](符号無し) / rs2[31:0](符号無し)を求める@<br>{}結果は符号拡張する
REM		rs1(符号付き) % rs2(符号付き)を求める
REMW	rs1[31:0](符号付き) % rs2[31:0](符号付き)を求める@<br>{}結果は符号拡張する
REMU	rs1(符号無し) % rs2(符号無し)を求める
REMUW	rs1[31:0](符号無し) % rs2[31:0](符号無し)を求める@<br>{}結果は符号拡張する
//}

Verylには積、商、剰余を求める演算子@<code>{*}、@<code>{/}、@<code>{%}が定義されており、
これを利用することで簡単に計算を実装できます(@<list>{example.by.operator})。

//list[example.by.operator][演算子による実装例]{
assign mul = op1 * op2;
assign div = op1 / op2;
assign rem = op1 % op2;
//}

例えば乗算回路をFPGA上に実装する場合、通常は合成系によってFPGAに搭載されている乗算器が自動的に利用されます@<fn>{specify.multiplyer}。
これにより、低遅延、低リソースコストで効率的な乗算回路を自動的に実現できます。
しかし、32ビットや64ビットの乗算を実装する際、
FPGA上の乗算器の数が不足すると、LUTを用いた大規模な乗算回路が構築されることがあります。
このような大規模な回路はFPGAのリソースの使用量や遅延に大きな影響を与えるため好ましくありません。
除算や剰余演算でも同じ問題@<fn>{no.divider}が生じることがあります。

//footnote[specify.multiplyer][手動で何をどのように利用するかを選択することもできます。既に用意された回路(IP)を使うこともできますが、本書は自作することを主軸としているため利用しません。]
//footnote[no.divider][そもそも除算器が搭載されていない場合があります。]

@<code>{*}、@<code>{/}、@<code>{%}演算子がどのような回路に合成されるかは、
合成系が全体の実装を考慮して自動的に決定するため、
その挙動をコントロールするのは難しいです。
そこで本章では、@<code>{*}、@<code>{/}、@<code>{%}演算子を使用せず、
足し算やシフト演算などの基本的な論理だけを用いて同等の演算を実装します。

基本編では積、商、剰余を効率よく@<fn>{muldiv.sufficient}求める実装は検討せず、できるだけ単純な方法で実装します。

//footnote[muldiv.sufficient][「効率」は、計算に要する時間やスループット、回路面積のことです。効率的に計算する方法については応用編で検討します。]

== 命令のデコード

まず、M拡張の命令をデコードします。
M拡張の命令はすべてR形式であり、レジスタの値同士の演算を行います。
funct7は@<code>{7'b0000001}です。
MUL、MULH、MULHSU、MULHU、DIV、DIVU、REM、REMU命令のopcodeは@<code>{7'b0110011}(OP)で、
MULW、DIVW、DIVUW、REMW、REMUW命令のopcodeは@<code>{7'b0111011}(OP-32)です。

それぞれの命令はfunct3で区別します(@<table>{m.funct3.64})。
乗算命令のfunct3はMSBが@<code>{0}、除算と剰余演算命令は@<code>{1}になっています。

//table[m.funct3.64][M拡張の命令の区別]{
命令		funct3
-------------------------------------------------------------
MUL、MULW	000
MULH		001
MULHU		010
MULHSU		011
DIV、DIVW	100	
DIVU、DIVWU	101
REM、REMW	110
REMU、REMUW	111
//}

@<code>{InstCtrl}構造体に、
M拡張の命令であることを示す@<code>{is_muldiv}フラグを追加します (@<list>{corectrl.veryl.create-mdu-range.InstCtrl})。

//list[corectrl.veryl.create-mdu-range.InstCtrl][is_muldivフラグを追加する (corectrl.veryl)]{
#@maprange(scripts/10/create-mdu-range/core/src/corectrl.veryl,InstCtrl)
    // 制御に使うフラグ用の構造体
    struct InstCtrl {
        itype    : InstType   , // 命令の形式
        rwb_en   : logic      , // レジスタに書き込むかどうか
        is_lui   : logic      , // LUI命令である
        is_aluop : logic      , // ALUを利用する命令である
        @<b>|is_muldiv: logic      , // M拡張の命令である|
        is_op32  : logic      , // OP-32またはOP-IMM-32である
        is_jump  : logic      , // ジャンプ命令である
        is_load  : logic      , // ロード命令である
        is_csr   : logic      , // CSR命令である
        funct3   : logic   <3>, // 命令のfunct3フィールド
        funct7   : logic   <7>, // 命令のfunct7フィールド
    }
#@end
//}

inst_decoderモジュールの@<code>{InstCtrl}を生成している部分を変更します。
opcodeが@<code>{OP}か@<code>{OP-32}の場合はfunct7の値によって@<code>{is_muldiv}を設定します(@<list>{inst_decoder.veryl.create-mdu-range.ctrl})。
その他のopcodeの@<code>{is_muldiv}は@<code>{F}に設定してください。

//list[inst_decoder.veryl.create-mdu-range.ctrl][is_muldivを設定する (inst_decoder.veryl) (一部)]{
#@maprange(scripts/10/create-mdu-range/core/src/inst_decoder.veryl,ctrl)
                OP_OP: {
                    InstType::R, T, F, T, @<b>|f7 == 7'b0000001,| F, F, F, F
                },
                OP_OP_IMM: {
                    InstType::I, T, F, T, @<b>|F,| F, F, F, F
                },
                OP_OP_32: {
                    InstType::R, T, F, T, @<b>|f7 == 7'b0000001,| T, F, F, F
                },
#@end
//}

== muldivunitモジュールの実装

=== muldivunitモジュールを作成する

M拡張の計算を処理するモジュールを作成し、
M拡張の命令がALUの結果ではなくモジュールの結果を利用するように変更します。

@<code>{src/muldivunit.veryl}を作成し、次のように記述します(@<list>{muldivunit.veryl.create-mdu-range})。

//list[muldivunit.veryl.create-mdu-range][muldivunit.veryl]{
#@mapfile(scripts/10/create-mdu-range/core/src/muldivunit.veryl)
import eei::*;

module muldivunit (
    clk   : input  clock   ,
    rst   : input  reset   ,
    ready : output logic   ,
    valid : input  logic   ,
    funct3: input  logic<3>,
    op1   : input  UIntX   ,
    op2   : input  UIntX   ,
    rvalid: output logic   ,
    result: output UIntX   ,
) {

    enum State {
        Idle,
        WaitValid,
        Finish,
    }

    var state: State;

    // saved_data
    var funct3_saved: logic<3>;

    always_comb {
        ready  = state == State::Idle;
        rvalid = state == State::Finish;
    }

    always_ff {
        if_reset {
            state        = State::Idle;
            result       = 0;
            funct3_saved = 0;
        } else {
            case state {
                State::Idle: if ready && valid {
                    state        = State::WaitValid;
                    funct3_saved = funct3;
                }
                State::WaitValid: state = State::Finish;
                State::Finish   : state = State::Idle;
                default         : {}
            }
        }
    }
}
#@end
//}

muldivunitモジュールは@<code>{ready}が@<code>{1}のときに計算のリクエストを受け付けます。
@<code>{valid}が@<code>{1}なら計算を開始し、
計算が終了したら@<code>{rvalid}を@<code>{1}、計算結果を@<code>{result}に設定します。

まだ計算処理を実装しておらず、@<code>{result}は常に@<code>{0}を返します。
次の計算を開始するまで@<code>{result}の値を維持します。

=== EXステージを変更する

M拡張の命令がEXステージにあるとき、ALUの結果の代わりにmuldivunitモジュールの結果を利用するように変更します。

まず、muldivunitモジュールをインスタンス化します(@<list>{core.veryl.create-mdu-range.muldivinst})。

//list[core.veryl.create-mdu-range.muldivinst][muldivunitモジュールをインスタンス化する (core.veryl)]{
#@maprange(scripts/10/create-mdu-range/core/src/core.veryl,muldivinst)
    var exs_muldiv_valid       : logic;
    var exs_muldiv_ready       : logic;
    var exs_muldiv_rvalid      : logic;
    var exs_muldiv_result      : UIntX;
    var exs_muldiv_rvalided    : logic;
    var exs_muldiv_stall       : logic;
    var exs_muldiv_is_requested: logic;

    inst mdu: muldivunit (
        clk                      ,
        rst                      ,
        valid : exs_muldiv_valid ,
        ready : exs_muldiv_ready ,
        funct3: exs_ctrl.funct3  ,
        op1   : exs_op1          ,
        op2   : exs_op2          ,
        rvalid: exs_muldiv_rvalid,
        result: exs_muldiv_result,
    );
#@end
//}

muldivunitモジュールで計算を開始するのは、
EXステージに命令が存在し(@<code>{exs_valid})、
命令がM拡張の命令であり(@<code>{exs_ctrl.is_muldiv})、
データハザードが発生しておらず(@<code>{!exs_data_hazard})、
まだ計算を要求していない場合です。
これらの条件を@<code>{exs_muldiv_valid}に設定します(@<list>{core.veryl.create-mdu-range.muldiv_comb})。

//list[core.veryl.create-mdu-range.muldiv_comb][計算の要求、ストールの条件の設定 (core.veryl)]{
#@maprange(scripts/10/create-mdu-range/core/src/core.veryl,muldiv_comb)
    always_comb {
        exs_muldiv_valid = 0;
        exs_muldiv_stall = 0;
        if (exs_valid && exs_ctrl.is_muldiv) {
            exs_muldiv_valid = !exs_data_hazard && !exs_muldiv_is_requested;
            exs_muldiv_stall = !(exs_muldiv_rvalid && exs_muldiv_is_requested) && !exs_muldiv_rvalided;
        }
    }
#@end
//}

muldivunitモジュールはALUモジュールのように1クロックの間に入力から出力を生成しないため、
計算中はEXステージをストールさせる必要があります。
ストールするかを示す@<code>{exs_muldiv_stall}変数を定義して、EXステージがストールする条件に追加します(
@<list>{core.veryl.create-mdu-range.muldiv_comb}、
@<list>{core.veryl.create-mdu-range.exq_rready}
)。

@<code>{exs_muldiv_is_requested}変数を定義し、
ステージの遷移条件とmuldivunitに計算を要求したかによって値を更新します(@<list>{core.veryl.create-mdu-range.exs_muldiv_is_requested})。
また、すでに計算が完了しているかを示す@<code>{exs_muldiv_rvalided}変数を定義し、
muldivunitモジュールの@<code>{rvalid}が@<code>{1}になったかを観測します。

//list[core.veryl.create-mdu-range.muldiv_ff][計算の要求、結果の状態の管理 (core.veryl)]{
#@maprange(scripts/10/create-mdu-range/core/src/core.veryl,muldiv_ff)
    always_ff {
        if_reset {
            exs_muldiv_rvalided     = 0;
            exs_muldiv_is_requested = 0;
        } else {
            // 次のステージに遷移
            if exq_rvalid && exq_rready {
                exs_muldiv_rvalided     = 0;
                exs_muldiv_is_requested = 0;
            } else {
                if exs_muldiv_is_requested {
                    // muldivunitの処理が完了していたら1にする
                    exs_muldiv_rvalided |= exs_muldiv_rvalid;
                }
                // muldivunitにリクエストしたか判定する
                if exs_muldiv_valid && exs_muldiv_ready {
                    exs_muldiv_is_requested = 1;
                }
            }
        }
    }
#@end
//}

M拡張の命令のとき、MEMステージに渡す@<code>{alu_result}の値をmuldivunitモジュールの結果に設定します(@<list>{core.veryl.create-mdu-range.exq_rready})。

//list[core.veryl.create-mdu-range.exq_rready][EXステージのストール条件の変更とM拡張の命令の結果の設定 (core.veryl)]{
#@maprange(scripts/10/create-mdu-range/core/src/core.veryl,exq_rready)
    @<b>{let exs_stall: logic = exs_data_hazard || exs_muldiv_stall;}

    always_comb {
        // EX -> MEM
        exq_rready            = memq_wready && @<b>|!exs_stall|;
        memq_wvalid           = exq_rvalid && @<b>|!exs_stall|;
        memq_wdata.addr       = exq_rdata.addr;
        memq_wdata.bits       = exq_rdata.bits;
        memq_wdata.ctrl       = exq_rdata.ctrl;
        memq_wdata.imm        = exq_rdata.imm;
        memq_wdata.rs1_addr   = exs_rs1_addr;
        memq_wdata.rs1_data   = exs_rs1_data;
        memq_wdata.rs2_data   = exs_rs2_data;
        memq_wdata.alu_result = @<b>|if exs_ctrl.is_muldiv ? exs_muldiv_result : exs_alu_result|;
        memq_wdata.br_taken   = exs_ctrl.is_jump || inst_is_br(exs_ctrl) && exs_brunit_take;
        memq_wdata.jump_addr  = if inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result & ~1;
    }
#@end
//}

muldivunitモジュールは計算が完了したクロックでしか@<code>{rvalid}を@<code>{1}にしないため、
既に計算が完了したことを示す@<code>{exs_muldiv_rvalided}変数で完了状態を管理します。
これにより、M拡張の命令によってストールする条件は、
命令がM拡張の命令であり(@<code>{exs_ctrl.is_muldiv})、
現在のクロックで計算が完了しておらず(@<code>{!exs_muldiv_rvalid})、
以前のクロックでも計算が完了していない(@<code>{!exs_muldiv_rvalided})
場合になります。

== 符号無しの乗算器の実装

=== mulunitモジュールを実装する

@<code>{WIDTH}ビットの符号無しの値同士の積を計算する乗算器を実装します。

@<code>{src/muldivunit.veryl}の中にmulunitモジュールを作成します(@<list>{muldivunit.veryl.impl-mulunit-range.mulunit})。

//list[muldivunit.veryl.impl-mulunit-range.mulunit][muldivunit.veryl]{
#@maprange(scripts/10/impl-mulunit-range/core/src/muldivunit.veryl,mulunit)
module mulunit #(
    param WIDTH: u32 = 0,
) (
    clk   : input  clock           ,
    rst   : input  reset           ,
    valid : input  logic           ,
    op1   : input  logic<WIDTH>    ,
    op2   : input  logic<WIDTH>    ,
    rvalid: output logic           ,
    result: output logic<WIDTH * 2>,
) {
    enum State {
        Idle,
        AddLoop,
        Finish,
    }

    var state: State;

    var op1zext: logic<WIDTH * 2>;
    var op2zext: logic<WIDTH * 2>;

    always_comb {
        rvalid = state == State::Finish;
    }

    var add_count: logic<32>;

    always_ff {
        if_reset {
            state     = State::Idle;
            result    = 0;
            add_count = 0;
            op1zext   = 0;
            op2zext   = 0;
        } else {
            case state {
                State::Idle: if valid {
                    state     = State::AddLoop;
                    result    = 0;
                    add_count = 0;
                    op1zext   = {1'b0 repeat WIDTH, op1};
                    op2zext   = {1'b0 repeat WIDTH, op2};
                }
                State::AddLoop: if add_count == WIDTH {
                    state = State::Finish;
                } else {
                    if op2zext[add_count] {
                        result += op1zext;
                    }
                    op1zext   <<= 1;
                    add_count +=  1;
                }
                State::Finish: state = State::Idle;
                default      : {}
            }
        }
    }
}
#@end
//}

mulunitモジュールは@<code>{op1 * op2}を計算するモジュールです。
@<code>{valid}が@<code>{1}になったら計算を開始し、
計算が完了したら@<code>{rvalid}を@<code>{1}、@<code>{result}を@<code>{WIDTH * 2}ビットの計算結果に設定します。

積は@<code>{WIDTH}回の足し算を@<code>{WIDTH}クロックかけて行って求めています(@<img>{mul_process})。
計算を開始すると入力をゼロで@<code>{WIDTH * 2}ビットに拡張し、
@<code>{result}を@<code>{0}でリセットします。

@<code>{State::AddLoop}では、次の操作を@<code>{WIDTH}回行います。
@<code>{i}回目では次の操作を行います。

 1. @<code>{op2[i-1]}が@<code>{1}なら@<code>{result}に@<code>{op1}を足す
 2. @<code>{op1}を1ビット左シフトする
 3. カウンタをインクリメントする

//image[mul_process][符号無し4ビットの乗算][width=70%]

=== mulunitモジュールをインスタンス化する

mulunitモジュールをmuldivunitモジュールでインスタンス化します
(@<list>{muldivunit.veryl.impl-mulunit-range.inst_mu})。
まだ結果は利用しません。

//list[muldivunit.veryl.impl-mulunit-range.inst_mu][mulunitモジュールをインスタンス化する (muldivunit.veryl)]{
#@maprange(scripts/10/impl-mulunit-range/core/src/muldivunit.veryl,inst_mu)
    // multiply unit
    const MUL_OP_WIDTH : u32 = XLEN;
    const MUL_RES_WIDTH: u32 = MUL_OP_WIDTH * 2;

    let is_mul   : logic                = if state == State::Idle ? !funct3[2] : !funct3_saved[2];
    var mu_rvalid: logic               ;
    var mu_result: logic<MUL_RES_WIDTH>;

    inst mu: mulunit #(
        WIDTH: MUL_OP_WIDTH,
    ) (
        clk                             ,
        rst                             ,
        valid : ready && valid && is_mul,
        op1   : op1                     ,
        op2   : op2                     ,
        rvalid: mu_rvalid               ,
        result: mu_result               ,
    );
#@end
//}


== MULHU命令の実装

MULHU命令は、2つの符号無しのXLENビットの値の乗算を実行し、
デスティネーションレジスタに結果(XLEN * 2ビット)の上位XLENビットを書き込む命令です。
funct3の下位2ビットによってmulunitモジュールの結果を選択するようにします
(@<list>{muldivunit.veryl.mulhu-range.result})。

//list[muldivunit.veryl.mulhu-range.result][MULHUモジュールの結果を取得する (muldivunit.veryl)]{
#@maprange(scripts/10/mulhu-range/core/src/muldivunit.veryl,result)
                State::WaitValid: @<b>|if is_mul && mu_rvalid {|
                    state  = State::Finish;
                    @<b>|result = case funct3_saved[1:0] {|
                    @<b>|    2'b11  : mu_result[XLEN+:XLEN], // MULHU|
                    @<b>|    default: 0,|
                    @<b>|};|
                @<b>|}|
#@end
//}


riscv-testsの@<code>{rv64um-p-mulhu}を実行し、成功することを確認してください。

== MUL、MULH命令の実装

=== 符号付き乗算を符号無し乗算器で実現する

MUL、MULH命令は、2つの符号付きのXLENビットの値の乗算を実行し、
デスティネーションレジスタにそれぞれ結果の下位XLENビット、上位XLENビットを書き込む命令です。

本章ではmulunitモジュールを使って、次のように符号付き乗算を実現します。

 1. 符号付きのXLENビットの値を符号無しの値(絶対値)に変換する
 2. 符号無しで積を計算する
 3. 計算結果の符号を修正する

絶対値で計算することで符号ビットを考慮する必要がなくなり、
既に実装してある符号無しの乗算器を変更せずに符号付きの乗算を実現できます。

=== 符号付き乗算を実装する

@<code>{WIDTH}ビットの符号付きの値を@<code>{WIDTH}ビットの符号無しの絶対値に変換するabs関数を作成します
(@<list>{muldivunit.veryl.mulmulh-range.abs})。
abs関数は、値のMSBが@<code>{1}ならビットを反転して@<code>{1}を足すことで符号を反転しています。
最小値@<code>{-2 ** (WIDTH - 1)}の絶対値も求められることを確認してください。

//list[muldivunit.veryl.mulmulh-range.abs][abs関数を実装する (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,abs)
    function abs::<WIDTH: u32> (
        value: input logic<WIDTH>,
    ) -> logic<WIDTH> {
        return if value[msb] ? ~value + 1 : value;
    }
#@end
//}

abs関数を利用して、MUL、MULH命令のときにmulunitに渡す値を絶対値に設定します
(@<list>{muldivunit.veryl.mulmulh-range.op1op2}、@<list>{muldivunit.veryl.mulmulh-range.mu})。

//list[muldivunit.veryl.mulmulh-range.op1op2][op1とop2を生成する (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,op1op2)
    let mu_op1: logic<MUL_OP_WIDTH> = case funct3[1:0] {
        2'b00, 2'b01: abs::<XLEN>(op1), // MUL, MULH
        2'b11       : op1, // MULHU
        default     : 0,
    };
    let mu_op2: logic<MUL_OP_WIDTH> = case funct3[1:0] {
        2'b00, 2'b01: abs::<XLEN>(op2), // MUL, MULH
        2'b11       : op2, // MULHU
        default     : 0,
    };
#@end
//}

//list[muldivunit.veryl.mulmulh-range.mu][mulunitに渡す値を変更する (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,mu)
    inst mu: mulunit #(
        WIDTH: MUL_OP_WIDTH,
    ) (
        clk                             ,
        rst                             ,
        valid : ready && valid && is_mul,
        op1   : @<b>|mu_op1|                  ,
        op2   : @<b>|mu_op2|                  ,
        rvalid: mu_rvalid               ,
        result: mu_result               ,
    );
#@end
//}

計算結果の符号は@<code>{op1}と@<code>{op2}の符号が異なる場合に負になります。
後で符号の情報を利用するために、muldivunitモジュールが要求を受け入れる時に符号を保存します
(
@<list>{muldivunit.veryl.mulmulh-range.opsign_save_reg}、
@<list>{muldivunit.veryl.mulmulh-range.always_reset}、
@<list>{muldivunit.veryl.mulmulh-range.idle}
)。

//list[muldivunit.veryl.mulmulh-range.opsign_save_reg][符号を保存する変数を作成する (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,opsign_save_reg)
    // saved_data
    var funct3_saved : logic<3>;
    @<b>|var op1sign_saved: logic   ;|
    @<b>|var op2sign_saved: logic   ;|
#@end
//}

//list[muldivunit.veryl.mulmulh-range.always_reset][変数のリセット (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,always_reset)
    always_ff {
        if_reset {
            state         = State::Idle;
            result        = 0;
            funct3_saved  = 0;
            @<b>|op1sign_saved = 0;|
            @<b>|op2sign_saved = 0;|
        } else {
#@end
//}

//list[muldivunit.veryl.mulmulh-range.idle][符号を変数に保存する (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,idle)
            case state {
                State::Idle: if ready && valid {
                    state         = State::WaitValid;
                    funct3_saved  = funct3;
                    @<b>|op1sign_saved = op1[msb];|
                    @<b>|op2sign_saved = op2[msb];|
                }
#@end
//}

保存した符号を利用して計算結果の符号を復元します
(@<list>{muldivunit.veryl.mulmulh-range.wait_valid})。

//list[muldivunit.veryl.mulmulh-range.wait_valid][計算結果の符号を復元する (muldivunit.veryl)]{
#@maprange(scripts/10/mulmulh-range/core/src/muldivunit.veryl,wait_valid)
                State::WaitValid: if is_mul && mu_rvalid {
                    @<b>|let res_signed: logic<MUL_RES_WIDTH> = if op1sign_saved != op2sign_saved ? ~mu_result + 1 : mu_result;|
                    state      = State::Finish;
                    result     = case funct3_saved[1:0] {
                        @<b>|2'b00  : res_signed[XLEN - 1:0], // MUL|
                        @<b>|2'b01  : res_signed[XLEN+:XLEN], // MULH|
                        2'b11  : mu_result[XLEN+:XLEN], // MULHU
                        default: 0,
                    };
                }
#@end
//}

riscv-testsの@<code>{rv64um-p-mul}と@<code>{rv64um-p-mulh}を実行し、成功することを確認してください。

=== MULHSU命令の実装

MULHSU命令は、符号付きのXLENビットのrs1と符号無しのXLENビットのrs2の乗算を実行し、
デスティネーションレジスタに結果の上位XLENビットを書き込む命令です。
計算結果は符号付きの値になります。

MULHSU命令も、MUL、MULH命令と同様に符号無しの乗算器で実現します。

@<code>{op1}を絶対値に変換し、@<code>{op2}はそのままに設定します
(@<list>{muldivunit.veryl.mulhsu-range.op1op2})。

//list[muldivunit.veryl.mulhsu-range.op1op2][MULHSU命令用にop1、op2を設定する (muldivunit.veryl)]{
#@maprange(scripts/10/mulhsu-range/core/src/muldivunit.veryl,op1op2)
    let mu_op1: logic<MUL_OP_WIDTH> = case funct3[1:0] {
        2'b00, 2'b01@<b>|, 2'b10|: abs::<XLEN>(op1), // MUL, MULH@<b>|, MULHSU|
        2'b11              : op1, // MULHU
        default            : 0,
    };
    let mu_op2: logic<MUL_OP_WIDTH> = case funct3[1:0] {
        2'b00, 2'b01: abs::<XLEN>(op2), // MUL, MULH
        2'b11@<b>|, 2'b10|: op2, // MULHU@<b>|, MULHSU|
        default     : 0,
    };
#@end
//}

計算結果は@<code>{op1}の符号にします
(@<list>{muldivunit.veryl.mulhsu-range.result})。

//list[muldivunit.veryl.mulhsu-range.result][計算結果の符号を復元する (muldivunit.veryl)]{
#@maprange(scripts/10/mulhsu-range/core/src/muldivunit.veryl,result)
                State::WaitValid: if is_mul && mu_rvalid {
                    let res_signed: logic<MUL_RES_WIDTH> = if op1sign_saved != op2sign_saved ? ~mu_result + 1 : mu_result;
                    @<b>|let res_mulhsu: logic<MUL_RES_WIDTH> = if op1sign_saved == 1 ? ~mu_result + 1 : mu_result;|
                    state      = State::Finish;
                    result     = case funct3_saved[1:0] {
                        2'b00  : res_signed[XLEN - 1:0], // MUL
                        2'b01  : res_signed[XLEN+:XLEN], // MULH
                        @<b>|2'b10  : res_mulhsu[XLEN+:XLEN], // MULHSU|
                        2'b11  : mu_result[XLEN+:XLEN], // MULHU
                        default: 0,
                    };
                }
#@end
//}

riscv-testsの@<code>{rv64um-p-mulhsu}を実行し、成功することを確認してください。

=== MULW命令の実装

MULW命令は、2つの符号付きの32ビットの値の乗算を実行し、
デスティネーションレジスタに結果の下位32ビットを符号拡張した値を書き込む命令です。

32ビット演算の命令であることを判定するために、
muldivunitモジュールに@<code>{is_op32}ポートを作成します
(
@<list>{muldivunit.veryl.mulw-range.port}、
@<list>{core.veryl.mulw-range.mdu}
)。

//list[muldivunit.veryl.mulw-range.port][is_op32ポートを追加する (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,port)
module muldivunit (
    clk    : input  clock   ,
    rst    : input  reset   ,
    ready  : output logic   ,
    valid  : input  logic   ,
    funct3 : input  logic<3>,
    @<b>|is_op32: input  logic   ,|
    op1    : input  UIntX   ,
    op2    : input  UIntX   ,
    rvalid : output logic   ,
    result : output UIntX   ,
) {
#@end
//}

//list[core.veryl.mulw-range.mdu][is_op32ポートに値を割り当てる (core.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/core.veryl,mdu)
    inst mdu: muldivunit (
        clk                       ,
        rst                       ,
        valid  : exs_muldiv_valid ,
        ready  : exs_muldiv_ready ,
        funct3 : exs_ctrl.funct3  ,
        @<b>|is_op32: exs_ctrl.is_op32 ,|
        op1    : exs_op1          ,
        op2    : exs_op2          ,
        rvalid : exs_muldiv_rvalid,
        result : exs_muldiv_result,
    );
#@end
//}

muldivunitモジュールが要求を受け入れる時に@<code>{is_op32}を保存します。
また、符号ビットを@<code>{is_op32}に応じて設定します
(
@<list>{muldivunit.veryl.mulw-range.savereg}、
@<list>{muldivunit.veryl.mulw-range.always_reset}、
@<list>{muldivunit.veryl.mulw-range.idle}
)。

//list[muldivunit.veryl.mulw-range.savereg][is_op32を保存する変数を作成する (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,savereg)
    // saved_data
    var funct3_saved : logic<3>;
    @<b>|var is_op32_saved: logic   ;|
    var op1sign_saved: logic   ;
    var op2sign_saved: logic   ;
#@end
//}

//list[muldivunit.veryl.mulw-range.always_reset][変数のリセット (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,always_reset)
    always_ff {
        if_reset {
            state         = State::Idle;
            result        = 0;
            funct3_saved  = 0;
            @<b>|is_op32_saved = 0;|
            op1sign_saved = 0;
            op2sign_saved = 0;
        } else {
#@end
//}

//list[muldivunit.veryl.mulw-range.idle][is_op32を変数に保存する (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,idle)
                State::Idle: if ready && valid {
                    state         = State::WaitValid;
                    funct3_saved  = funct3;
                    @<b>|is_op32_saved = is_op32;|
                    @<b>|op1sign_saved = if is_op32 ? op1[31] : op1[msb];|
                    @<b>|op2sign_saved = if is_op32 ? op2[31] : op2[msb];|
                }
#@end
//}

mulunitモジュールの@<code>{op1}と@<code>{op2}に、64ビットの値の下位32ビットを符号拡張した値を割り当てます。
符号拡張を行うsext関数を作成し、@<code>{mu_op1}、@<code>{mu_op2}の割り当てに利用します
(
@<list>{muldivunit.veryl.mulw-range.sext}、
@<list>{muldivunit.veryl.mulw-range.op1op2}
)。

//list[muldivunit.veryl.mulw-range.sext][符号拡張する関数を作成する (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,sext)
    function sext::<WIDTH_IN: u32, WIDTH_OUT: u32> (
        value: input logic<WIDTH_IN>,
    ) -> logic<WIDTH_OUT> {
        return {value[msb] repeat WIDTH_OUT - WIDTH_IN, value};
    }
#@end
//}
//list[muldivunit.veryl.mulw-range.op1op2][MULW命令用にop1、op2を設定する (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,op1op2)
    let mu_op1: logic<MUL_OP_WIDTH> = case funct3[1:0] {
        2'b00, 2'b01, 2'b10: abs::<XLEN>(@<b>|if is_op32 ? sext::<32, XLEN>(op1[31:0]) : |op1), // MUL, MULH, MULHSU@<b>|, MULW|
        2'b11              : op1, // MULHU
        default            : 0,
    };
    let mu_op2: logic<MUL_OP_WIDTH> = case funct3[1:0] {
        2'b00, 2'b01: abs::<XLEN>(@<b>|if is_op32 ? sext::<32, XLEN>(op2[31:0]) : |op2), // MUL, MULH@<b>|, MULW|
        2'b11, 2'b10: op2, // MULHU, MULHSU
        default     : 0,
    };
#@end
//}

最後に、計算結果を符号拡張した値に設定します
(@<list>{muldivunit.veryl.mulw-range.wait_valid})。

//list[muldivunit.veryl.mulw-range.wait_valid][計算結果を符号拡張する (muldivunit.veryl)]{
#@maprange(scripts/10/mulw-range/core/src/muldivunit.veryl,wait_valid)
                State::WaitValid: if is_mul && mu_rvalid {
                    let res_signed: logic<MUL_RES_WIDTH> = if op1sign_saved != op2sign_saved ? ~mu_result + 1 : mu_result;
                    let res_mulhsu: logic<MUL_RES_WIDTH> = if op1sign_saved == 1 ? ~mu_result + 1 : mu_result;
                    state      = State::Finish;
                    result     = case funct3_saved[1:0] {
                        2'b00  : @<b>|if is_op32_saved ? sext::<32, 64>(res_signed[31:0]) :| res_signed[XLEN - 1:0], // MUL@<b>|, MULW|
                        2'b01  : res_signed[XLEN+:XLEN], // MULH
#@end
//}
riscv-testsの@<code>{rv64um-p-mulw}を実行し、成功することを確認してください。

== 符号無し除算の実装

=== divunitモジュールを実装する

@<code>{WIDTH}ビットの除算を計算する除算器を実装します。

@<code>{src/muldivunit.veryl}の中にdivunitモジュールを作成します
(@<list>{muldivunit.veryl.divuremu-range.divunit})。

//list[muldivunit.veryl.divuremu-range.divunit][muldivunit.veryl]{
#@maprange(scripts/10/divuremu-range/core/src/muldivunit.veryl,divunit)
module divunit #(
    param WIDTH: u32 = 0,
) (
    clk      : input  clock       ,
    rst      : input  reset       ,
    valid    : input  logic       ,
    dividend : input  logic<WIDTH>,
    divisor  : input  logic<WIDTH>,
    rvalid   : output logic       ,
    quotient : output logic<WIDTH>,
    remainder: output logic<WIDTH>,
) {
    enum State {
        Idle,
        ZeroCheck,
        SubLoop,
        Finish,
    }

    var state: State;

    var dividend_saved: logic<WIDTH * 2>;
    var divisor_saved : logic<WIDTH * 2>;

    always_comb {
        rvalid    = state == State::Finish;
        remainder = dividend_saved[WIDTH - 1:0];
    }

    var sub_count: u32;

    always_ff {
        if_reset {
            state          = State::Idle;
            quotient       = 0;
            sub_count      = 0;
            dividend_saved = 0;
            divisor_saved  = 0;
        } else {
            case state {
                State::Idle: if valid {
                    state          = State::ZeroCheck;
                    dividend_saved = {1'b0 repeat WIDTH, dividend};
                    divisor_saved  = {1'b0, divisor, 1'b0 repeat WIDTH - 1};
                    quotient       = 0;
                    sub_count      = 0;
                }
                State::ZeroCheck: if divisor_saved == 0 {
                    state    = State::Finish;
                    quotient = '1;
                } else {
                    state = State::SubLoop;
                }
                State::SubLoop: if sub_count == WIDTH {
                    state = State::Finish;
                } else {
                    if dividend_saved >= divisor_saved {
                        dividend_saved -= divisor_saved;
                        quotient       =  (quotient << 1) + 1;
                    } else {
                        quotient <<= 1;
                    }
                    divisor_saved >>= 1;
                    sub_count     +=  1;
                }
                State::Finish: state = State::Idle;
                default      : {}
            }
        }
    }
}
#@end
//}

divunitモジュールは被除数(@<code>{dividend})と除数(@<code>{divisor})の
商(@<code>{quotient})と剰余(@<code>{remainder})を計算するモジュールです。
@<code>{valid}が@<code>{1}になったら計算を開始し、
計算が完了したら@<code>{rvalid}を@<code>{1}に設定します。

商と剰余は@<code>{WIDTH}回の引き算を@<code>{WIDTH}クロックかけて行って求めています。
計算を開始すると被除数を@<code>{0}で@<code>{WIDTH * 2}ビットに拡張し、
除数を@<code>{WIDTH-1}ビット左シフトします。
また、商を@<code>{0}でリセットします。

@<code>{State::SubLoop}では、次の操作を@<code>{WIDTH}回行います。

 1. 被除数が除数よりも大きいなら、被除数から除数を引き、商のLSBを1にする
 2. 商を1ビット左シフトする
 3. 除数を1ビット右シフトする
 3. カウンタをインクリメントする

RISC-Vでは、除数が@<code>{0}だったり結果がオーバーフローするようなLビットの除算の結果は@<table>{riscv.div.expt}のようになると定められています。
このうちdivunitモジュールは符号無しの除算(DIVU、REMU命令)のゼロ除算だけを対処しています。

//table[riscv.div.expt][除算の例外的な動作と結果]{
操作			ゼロ除算	オーバーフロー
-------------------------------------------------------------
符号付き除算	-1			-2**(L-1)
符号付き剰余	被除数		0
符号無し除算	2**L-1		発生しない
符号無し剰余	被除数		発生しない
//}

=== divunitモジュールをインスタンス化する

divunitモジュールをmuldivunitモジュールでインスタンス化します
(@<list>{muldivunit.veryl.divuremu-range.du})。
まだ結果は利用しません。

//list[muldivunit.veryl.divuremu-range.du][divunitモジュールをインスタンス化する (muldivunit.veryl)]{
#@maprange(scripts/10/divuremu-range/core/src/muldivunit.veryl,du)
    // divider unit
    const DIV_WIDTH: u32 = XLEN;

    var du_rvalid   : logic           ;
    var du_quotient : logic<DIV_WIDTH>;
    var du_remainder: logic<DIV_WIDTH>;

    inst du: divunit #(
        WIDTH: DIV_WIDTH,
    ) (
        clk                                 ,
        rst                                 ,
        valid    : ready && valid && !is_mul,
        dividend : op1                      ,
        divisor  : op2                      ,
        rvalid   : du_rvalid                ,
        quotient : du_quotient              ,
        remainder: du_remainder             ,
    );
#@end
//}

== DIVU、REMU命令の実装

DIVU、REMU命令は、符号無しのXLENビットのrs1(被除数)と符号無しのXLENビットのrs2(除数)の商、剰余を計算し、
デスティネーションレジスタにそれぞれ結果を書き込む命令です。

muldivunitモジュールで、divunitモジュールの処理が終わったら結果を@<code>{result}レジスタに割り当てるようにします
(@<list>{muldivunit.veryl.divuremu-range.wait_valid})。

//list[muldivunit.veryl.divuremu-range.wait_valid][divunitモジュールの結果をresultに割り当てる (muldivunit.veryl)]{
#@maprange(scripts/10/divuremu-range/core/src/muldivunit.veryl,wait_valid)
                State::WaitValid: if is_mul && mu_rvalid {
                    let res_signed: logic<MUL_RES_WIDTH> = if op1sign_saved != op2sign_saved ? ~mu_result + 1 : mu_result;
                    let res_mulhsu: logic<MUL_RES_WIDTH> = if op1sign_saved == 1 ? ~mu_result + 1 : mu_result;
                    state      = State::Finish;
                    result     = case funct3_saved[1:0] {
                        2'b00  : if is_op32_saved ? sext::<32, 64>(res_signed[31:0]) : res_signed[XLEN - 1:0], // MUL, MULW
                        2'b01  : res_signed[XLEN+:XLEN], // MULH
                        2'b10  : res_mulhsu[XLEN+:XLEN], // MULHSU
                        2'b11  : mu_result[XLEN+:XLEN], // MULHU
                        default: 0,
                    };
                @<b>|} else if !is_mul && du_rvalid {|
                    @<b>|result = case funct3_saved[1:0] {|
                    @<b>|    2'b01  : du_quotient, // DIVU|
                    @<b>|    2'b11  : du_remainder, // REMU|
                    @<b>|    default: 0,|
                    @<b>|};|
                    @<b>|state = State::Finish;|
                }
#@end
//}

riscv-testsの@<code>{rv64um-p-divu}、@<code>{rv64um-p-remu}を実行し、成功することを確認してください。

== DIV、REM命令の実装

=== 符号付き除算を符号無し除算器で実現する

DIV、REM命令は、それぞれDIVU、REMU命令の動作を符号付きに変えた命令です。
本章では、符号付き乗算と同じように値を絶対値に変換して計算することで符号付き除算を実現します。

RISC-Vの符号付き除算の結果は0の方向に丸められた整数になり、剰余演算の結果は被除数と同じ符号になります。
符号付き剰余の絶対値は符号無し剰余の結果と一致するため、
絶対値で計算してから符号を戻すことで、符号無し除算器だけで符号付きの剰余演算を実現できます。

=== 符号付き除算を実装する

abs関数を利用して、DIV、REM命令のときにdivunitモジュールに渡す値を絶対値に設定します
(
@<list>{muldivunit.veryl.divrem-range.op}
@<list>{muldivunit.veryl.divrem-range.du}
)。

//list[muldivunit.veryl.divrem-range.op][除数と被除数を生成する (muldivunit.veryl)]{
#@maprange(scripts/10/divrem-range/core/src/muldivunit.veryl,op)
    function generate_div_op (
        funct3: input logic<3>   ,
        value : input logic<XLEN>,
    ) -> logic<DIV_WIDTH> {
        return case funct3[1:0] {
            2'b00, 2'b10: abs::<DIV_WIDTH>(value), // DIV, REM
            2'b01, 2'b11: value, // DIVU, REMU
            default     : 0,
        };
    }

    let du_dividend: logic<DIV_WIDTH> = generate_div_op(funct3, op1);
    let du_divisor : logic<DIV_WIDTH> = generate_div_op(funct3, op2);
#@end
//}

//list[muldivunit.veryl.divrem-range.du][divunitに渡す値を変更する (muldivunit.veryl)]{
#@maprange(scripts/10/divrem-range/core/src/muldivunit.veryl,du)
    inst du: divunit #(
        WIDTH: DIV_WIDTH,
    ) (
        clk                                                     ,
        rst                                                     ,
        valid    : ready && valid && !is_mul @<b>|&& !du_signed_error|,
        dividend : @<b>|du_dividend|                                  ,
        divisor  : @<b>|du_divisor|                                   ,
        rvalid   : du_rvalid                                    ,
        quotient : du_quotient                                  ,
        remainder: du_remainder                                 ,
    );
#@end
//}

@<table>{riscv.div.expt}にあるように、符号付き演算は結果がオーバーフローする場合とゼロで割る場合の結果が定められています。
その場合には、divunitモジュールで除算を実行せず、muldivunitで計算結果を直接生成するようにします
(
@<list>{muldivunit.veryl.divrem-range.error}
@<list>{muldivunit.veryl.divrem-range.idle}
)。
符号付き演算かどうかを@<code>{funct3}のLSBで確認し、例外的な処理ではない場合にのみdivunitモジュールで計算を開始するようにします。

//list[muldivunit.veryl.divrem-range.error][符号付き除算がオーバーフローするか、ゼロ除算かどうかを判定する (muldivunit.veryl)]{
#@maprange(scripts/10/divrem-range/core/src/muldivunit.veryl,error)
    var du_signed_overflow: logic;
    var du_signed_divzero : logic;
    var du_signed_error   : logic;

    always_comb {
        du_signed_overflow = !funct3[0] && op1[msb] == 1 && op1[msb - 1:0] == 0 && &op2;
        du_signed_divzero  = !funct3[0] && op2 == 0;
        du_signed_error    = du_signed_overflow || du_signed_divzero;
    }
#@end
//}

//list[muldivunit.veryl.divrem-range.idle][符号付き除算の例外的な結果を処理する (muldivunit.veryl)]{
#@maprange(scripts/10/divrem-range/core/src/muldivunit.veryl,idle)
                State::Idle: if ready && valid {
                    funct3_saved  = funct3;
                    is_op32_saved = is_op32;
                    op1sign_saved = if is_op32 ? op1[31] : op1[msb];
                    op2sign_saved = if is_op32 ? op2[31] : op2[msb];
                    @<b>|if is_mul {|
                        state = State::WaitValid;
                    @<b>|} else {|
                    @<b>|    if du_signed_overflow {|
                    @<b>|        state  = State::Finish;|
                    @<b>|        result = if funct3[1] ? 0 : {1'b1, 1'b0 repeat XLEN - 1}; // REM : DIV|
                    @<b>|    } else if du_signed_divzero {|
                    @<b>|        state  = State::Finish;|
                    @<b>|        result = if funct3[1] ? op1 : '1; // REM : DIV|
                    @<b>|    } else {|
                    @<b>|        state = State::WaitValid;|
                    @<b>|    }|
                    @<b>|}|
                }
#@end
//}

計算が終了したら、商と剰余の符号を復元します。
商の符号は除数と被除数の符号が異なる場合に負になります。
剰余の符号は被除数の符号にします
(@<list>{muldivunit.veryl.divrem-range.wait_valid})。

//list[muldivunit.veryl.divrem-range.wait_valid][計算結果の符号を復元する (muldivunit.veryl)]{
#@maprange(scripts/10/divrem-range/core/src/muldivunit.veryl,wait_valid)
                } else if !is_mul && du_rvalid {
                    @<b>|let quo_signed: logic<DIV_WIDTH> = if op1sign_saved != op2sign_saved ? ~du_quotient + 1 : du_quotient;|
                    @<b>|let rem_signed: logic<DIV_WIDTH> = if op1sign_saved == 1 ? ~du_remainder + 1 : du_remainder;|
                    result     = case funct3_saved[1:0] {
                        @<b>|2'b00  : quo_signed[XLEN - 1:0], // DIV|
                        2'b01  : du_quotient[XLEN - 1:0], // DIVU
                        @<b>|2'b10  : rem_signed[XLEN - 1:0], // REM|
                        2'b11  : du_remainder[XLEN - 1:0], // REMU
                        default: 0,
                    };
                    state = State::Finish;
                }
#@end
//}

riscv-testsの@<code>{rv64um-p-div}、@<code>{rv64um-p-rem}を実行し、成功することを確認してください。

== DIVW、DIVUW、REMW、REMUW命令の実装

DIVW、DIVUW、REMW、REMUW命令は、それぞれDIV、DIVU、REM、REMU命令の動作を32ビット同士の演算に変えた命令です。
32ビットの結果をXLENビットに符号拡張した値をデスティネーションレジスタに書き込みます。

generate_div_op関数に@<code>{is_op32}フラグを追加して、
@<code>{is_op32}が@<code>{1}なら値を@<code>{DIV_WIDTH}ビットに拡張したものに変更します
(@<list>{muldivunit.veryl.divwremw-range.op})。

//list[muldivunit.veryl.divwremw-range.op][除数、被除数を32ビットの値にする (muldivunit.veryl)]{
#@maprange(scripts/10/divwremw-range/core/src/muldivunit.veryl,op)
    function generate_div_op (
        @<b>|is_op32: input logic      ,|
        funct3 : input logic<3>   ,
        value  : input logic<XLEN>,
    ) -> logic<DIV_WIDTH> {
        return case funct3[1:0] {
            2'b00, 2'b10: abs::<DIV_WIDTH>(@<b>|if is_op32 ? sext::<32, DIV_WIDTH>(value[31:0]) :| value), // DIV, REM
            2'b01, 2'b11: @<b>|if is_op32 ? {1'b0 repeat DIV_WIDTH - 32, value[31:0]} :| value, // DIVU, REMU
            default     : 0,
        };
    }

    let du_dividend: logic<DIV_WIDTH> = generate_div_op(@<b>|is_op32,| funct3, op1);
    let du_divisor : logic<DIV_WIDTH> = generate_div_op(@<b>|is_op32,| funct3, op2);
#@end
//}

符号付き除算のオーバーフローとゼロ除算の判定を@<code>{is_op32}で変更します
(@<list>{muldivunit.veryl.divwremw-range.error})。

//list[muldivunit.veryl.divwremw-range.error][32ビット演算のときの例外的な処理に対応する (muldivunit.veryl)]{
#@maprange(scripts/10/divwremw-range/core/src/muldivunit.veryl,error)
    always_comb {
        @<b>|if is_op32 {|
        @<b>|    du_signed_overflow = !funct3[0] && op1[31] == 1 && op1[31:0] == 0 && &op2[31:0];|
        @<b>|    du_signed_divzero  = !funct3[0] && op2[31:0] == 0;|
        @<b>|} else {|
            du_signed_overflow = !funct3[0] && op1[msb] == 1 && op1[msb - 1:0] == 0 && &op2;
            du_signed_divzero  = !funct3[0] && op2 == 0;
        @<b>|}|
        du_signed_error = du_signed_overflow || du_signed_divzero;
    }
#@end
//}

ゼロ除算のときの結果を@<code>{is_op32}に応じて変更します
(@<list>{muldivunit.veryl.divwremw-range.idle_error_handle})。
//list[muldivunit.veryl.divwremw-range.idle_error_handle][32ビット演算のときの例外的な処理に対応する (muldivunit.veryl)]{
#@maprange(scripts/10/divwremw-range/core/src/muldivunit.veryl,idle_error_handle)
                State::Idle: if ready && valid {
                    funct3_saved  = funct3;
                    is_op32_saved = is_op32;
                    op1sign_saved = if is_op32 ? op1[31] : op1[msb];
                    op2sign_saved = if is_op32 ? op2[31] : op2[msb];
                    if is_mul {
                        state = State::WaitValid;
                    } else {
                        if du_signed_overflow {
                            state  = State::Finish;
                            result = if funct3[1] ? 0 : {1'b1, 1'b0 repeat XLEN - 1}; // REM : DIV
                        } else if du_signed_divzero {
                            state  = State::Finish;
                            result = if funct3[1] ? @<b>|(if is_op32 ? sext::<32, 64>(op1[31:0]) :| op1@<b>|)| : '1; // REM : DIV
                        } else {
                            state = State::WaitValid;
                        }
                    }
                }
#@end
//}

最後に、32ビットの結果をXLENビットに符号拡張します
(@<list>{muldivunit.veryl.divwremw-range.wait_valid})。
符号付き、符号無し演算のどちらも32ビットの結果を符号拡張したものが結果になります。

//list[muldivunit.veryl.divwremw-range.wait_valid][32ビット演算のとき、結果を符号拡張する (muldivunit.veryl)]{
#@maprange(scripts/10/divwremw-range/core/src/muldivunit.veryl,wait_valid)
                } else if !is_mul && du_rvalid {
                    let quo_signed: logic<DIV_WIDTH> = if op1sign_saved != op2sign_saved ? ~du_quotient + 1 : du_quotient;
                    let rem_signed: logic<DIV_WIDTH> = if op1sign_saved == 1 ? ~du_remainder + 1 : du_remainder;
                    @<b>|let resultX   : UIntX|            = case funct3_saved[1:0] {
                        2'b00  : quo_signed[XLEN - 1:0], // DIV
                        2'b01  : du_quotient[XLEN - 1:0], // DIVU
                        2'b10  : rem_signed[XLEN - 1:0], // REM
                        2'b11  : du_remainder[XLEN - 1:0], // REMU
                        default: 0,
                    };
                    state  = State::Finish;
                    @<b>|result = if is_op32_saved ? sext::<32, 64>(resultX[31:0]) : resultX;|
                }
#@end
//}

riscv-testsの@<code>{rv64um-p-}から始まるテストを実行し、成功することを確認してください。

これでM拡張を実装できました。