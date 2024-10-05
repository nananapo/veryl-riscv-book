= RV64Iの実装

これまでに、RISC-Vの32ビットの基本整数命令セットであるRV32IのCPUを実装しました。
RISC-Vには64ビットの基本整数命令セットとしてRV64Iが定義されています。
本章では、RV32IのCPUをRV64Iにアップグレードします。

では、具体的にRV32IとRV64Iは何が違うのでしょうか?

まず、RV64IではXLENが32ビットから64ビットに変更され、レジスタの幅や各種演算命令の演算の幅が64ビットになります。
それに伴い、
32ビット幅での演算を行う命令、
64ビット幅でロードストアを行う命令が追加されます(@<table>{rv64i.new_insts})。
また、演算の幅が64ビットに広がるだけではなく、
動作が少し変わる命令が存在します(@<table>{rv64i.change})。

//table[rv64i.new_insts][RV64Iで追加される命令]{
命令	動作
-------------------------------------------------------------
ADD[I]W	32ビット単位で加算を行う。結果は符号拡張する
SUBW	32ビット単位で減算を行う。結果は符号拡張する
SLL[I]W	レジスタの値を0 ~ 31ビット左論理シフトする。結果は符号拡張する
SRL[I]W	レジスタの値を0 ~ 31ビット右論理シフトする。結果は符号拡張する
SRA[I]W	レジスタの値を0 ~ 31ビット右算術シフトする。結果は符号拡張する
LWU		メモリから32ビット読み込む。結果はゼロで拡張する
LD		メモリから64ビット読み込む
SD		メモリに64ビット書き込む
//}

//table[rv64i.change][RV64Iで変更される命令]{
命令	動作
-------------------------------------------------------------
SLL[I]	0 ~ 63ビット左論理シフトする
SRL[I]	0 ~ 63ビット右論理シフトする
SRA[I]	0 ~ 63ビット右算術シフトする
LUI		32ビットの即値を生成する。結果は符号拡張する
AUIPC	32ビットの即値を符号拡張したものにpcを足し合わせる
LW		メモリから32ビット読み込む。結果は符号拡張する
//}

実装のテストにはriscv-testsを利用します。
RV64I向けのテストは@<code>{rv64i-p-}から始まるテストです。
命令を実装するたびにテストを実行することで、命令が正しく実行できていることを確認します。

== XLENを変更する

eeiパッケージに定義しているXLENを64に変更します。
RV64Iになっても命令の幅(@<code>{ILEN})は32ビットのままです。

//list[xlen.change][XLENを変更する (eei.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/eei.veryl,xlen)
    const XLEN: u32 = @<b>|64|;
#@end
//}

=== SLL[I], SRL[I], SRA[I]命令の対応

RV32Iでは、シフト命令はrs1の値を0 ~ 31ビットシフトする命令として定義されています。
これが、RV64Iでは、rs1の値を0 ~ 64ビットシフトする命令に変更されます。

これに対応するために、ALUのシフト演算する量を5ビットから6ビットに変更します。

//list[shift.change][シフト命令でシフトする量を変更する (alu.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/alu.veryl,shift)
    let sll: UIntX = op1 << op2[@<b>|5|:0];
    let srl: UIntX = op1 >> op2[@<b>|5|:0];
    let sra: SIntX = $signed(op1) >>> op2[@<b>|5|:0];
#@end
//}

I形式の命令(SLLI, SRLI, SRAI)のときは即値、
R形式の命令(SLL, SRL, SRA)のときはレジスタの下位6ビットが利用されるようになります。

=== LUI, AUIPC命令の対応

RV32Iでは、LUI命令は32ビットの即値をそのまま保存する命令として定義されています。
これが、RV64Iでは、32ビットの即値を64ビットに符号拡張した値を保存する命令に変更されます。
AUIPC命令も同様で、即値にPCを足す前に、即値を64ビットに符号拡張します。

この対応ですが、XLENを64に変更した時点ですでに完了しています。
よって、コードの変更の必要はありません。

//list[imm.not.change][U形式の即値はXLENビットに拡張されている (inst_decoder.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/inst_decoder.veryl,imm)
    let imm_u: UIntX = {bits[31] repeat XLEN - $bits(imm_u_g) - 12, imm_u_g, 12'b0};
#@end
//}

=== CSRの対応

MXLEN(=XLEN)が64ビットに変更されると、CSRの幅も64ビットに変更されます。
そのため、mtvec, mepc, mcauseレジスタの幅を64ビットに変更する必要があります。

しかし、mtvec, mepc, mcauseレジスタは
XLENビットのレジスタ(@<code>{UIntX})として定義しているため、
変更の必要はありません。
また、mtvec, mepc, mcauseレジスタはMXLENを基準に定義されており、
RV32IからRV64Iに変わってもフィールドに変化はないため、対応は必要ありません。

唯一、書き込みマスクの幅を広げる必要があります。

//list[csrunit.wmask.expand][CSRの書き込みマスクの幅を広げる (csrunit.veryl)]{
#@maprange(scripts/05/xlen-csrunit-range/core/src/csrunit.veryl,wmask)
    const MTVEC_WMASK : UIntX = 'h@<b>|ffff_ffff_|ffff_fffc;
    const MEPC_WMASK  : UIntX = 'h@<b>|ffff_ffff_|ffff_fffc;
    const MCAUSE_WMASK: UIntX = 'h@<b>|ffff_ffff_|ffff_ffff;
#@end
//}

=== LW命令の対応

RV64Iでは、LW命令の結果が64ビットに符号拡張されるようになります。
これに対応するため、memunitモジュールの@<code>{rdata}の割り当てのLW部分を変更します。

//list[lw.extend][LW命令のメモリの読み込み結果を符号拡張する (memunit.veryl)]{
#@maprange(scripts/05/xlen-memunit-range/core/src/memunit.veryl,lw)
    2'b10  : @<b>|{D[31] repeat W - 32, D[31:0]}|,
#@end
//}

=== riscv-testsでテストする

TODO

== ADD[I]W, SUBW命令の実装

RV64Iでは、ADD命令は64ビット単位で演算する命令になり、
32ビットの加算をするADDW, ADDIW命令が追加されます。
同様に、SUB命令は64ビッド単位の演算になり、
32ビットの減算をするSUBW命令が追加されます。
32ビットの演算結果は符号拡張します。

=== ADD[I]W, SUBW命令をデコードする

//image[addsubw][ADDW, ADDIW, SUBW命令のフォーマット@<bib>{isa-manual.1.37}]

ADDW, SUBW命令はR形式で、opcodeは@<code>{OP-32}(@<code>{0111011})です。
ADDIW命令はI形式で、opcodeは@<code>{OP-IMM-32}(@<code>{0011011})です。

まず、eeiパッケージにopcodeの定数を定義します。

//list[eei.veryl.op32][opcodeを定義する (eei.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/eei.veryl,op)
    const OP_OP_32    : logic<7> = 7'b0111011;
    const OP_OP_IMM_32: logic<7> = 7'b0011011;
#@end
//}

次に、@<code>{InstCtrl})構造体に、
32ビット単位で演算を行う命令であることを示す@<code>{is_op32}フラグを追加します。

//list[corectrl.veryl.is_op32][is_op32を追加する (corectrl.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/corectrl.veryl,is_op32)
    struct InstCtrl {
        itype   : InstType   , // 命令の形式
        rwb_en  : logic      , // レジスタに書き込むかどうか
        is_lui  : logic      , // LUI命令である
        is_aluop: logic      , // ALUを利用する命令である
        @<b>|is_op32 : logic      , // OP-32またはOP-IMM-32である| @<balloon>{追加}
        is_jump : logic      , // ジャンプ命令である
        is_load : logic      , // ロード命令である
        is_csr  : logic      , // CSR命令である
        funct3  : logic   <3>, // 命令のfunct3フィールド
        funct7  : logic   <7>, // 命令のfunct7フィールド
    }
#@end
//}

inst_decoderモジュールの@<code>{InstCtrl}と即値を生成している部分を変更します。
これでデコードは完了です。

//list[inst_decoder.veryl.ctrl][OP-32, OP-IMM-32のInstCtrlの生成 (inst_decoder.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/inst_decoder.veryl,ctrl)
                                       is_op32を追加
    ctrl = {case op {                        ↓
        OP_LUI      : {InstType::U, T, T, F, @<b>|F|, F, F, F},
        OP_AUIPC    : {InstType::U, T, F, F, @<b>|F|, F, F, F},
        OP_JAL      : {InstType::J, T, F, F, @<b>|F|, T, F, F},
        OP_JALR     : {InstType::I, T, F, F, @<b>|F|, T, F, F},
        OP_BRANCH   : {InstType::B, F, F, F, @<b>|F|, F, F, F},
        OP_LOAD     : {InstType::I, T, F, F, @<b>|F|, F, T, F},
        OP_STORE    : {InstType::S, F, F, F, @<b>|F|, F, F, F},
        OP_OP       : {InstType::R, T, F, T, @<b>|F|, F, F, F},
        OP_OP_IMM   : {InstType::I, T, F, T, @<b>|F|, F, F, F},
        @<b>|OP_OP_32    : {InstType::R, T, F, T, @<b>|T|, F, F, F},| @<balloon>{追加}
        @<b>|OP_OP_IMM_32: {InstType::I, T, F, T, @<b>|T|, F, F, F},| @<balloon>{追加}
        OP_SYSTEM   : {InstType::I, T, F, F, @<b>|F|, F, F, T},
        default     : {InstType::X, F, F, F, @<b>|F|, F, F, F},
    }, f3, f7};
#@end
//}

//list[inst_decoder.veryl.imm][OP-32, OP-IMM-32の即値の生成 (inst_decoder.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/inst_decoder.veryl,imm)
    imm = case op {
        OP_LUI, OP_AUIPC       : imm_u,
        OP_JAL                 : imm_j,
        OP_JALR, OP_LOAD       : imm_i,
        OP_OP_IMM, @<b>|OP_OP_IMM_32|: imm_i,
        OP_BRANCH              : imm_b,
        OP_STORE               : imm_s,
        default                : 'x,
    };
#@end
//}

=== ALUにADDW, SUBWを実装する

制御フラグを生成できたので、
それに応じて32ビットのADD, SUBを行うようにします。

まず、32ビットの足し算と引き算の結果を生成します。

//list[alu.veryl.addsubw][32ビットの足し算と引き算をする (alu.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/alu.veryl,32)
    let add32: UInt32 = op1[31:0] + op2[31:0];
    let sub32: UInt32 = op1[31:0] - op2[31:0];
#@end
//}

次に、フラグによって演算結果を選択する関数@<code>{sel_w}を作成します。
この関数は、
@<code>{is_op32}が@<code>{1}なら@<code>{value32}を64ビットに符号拡張した値を、
@<code>{0}なら@<code>{value64}を返します。

//list[alu.veryl.sel_w][演算結果を選択する関数を作成する (alu.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/alu.veryl,sel)
    function sel_w (
        is_op32: input logic ,
        value32: input UInt32,
        value64: input UInt64,
    ) -> UInt64 {
        if is_op32 {
            return {value32[msb] repeat 32, value32};
        } else {
            return value64;
        }
    }
#@end
//}

@<code>{sel_w}関数を使用し、aluモジュールの演算処理を変更します。
case文の足し算と引き算の部分を次のように変更します。

//list[alu.veryl.addw.case][32ビットの演算結果を選択する (alu.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/alu.veryl,case)
    3'b000: result = if ctrl.itype == InstType::I | ctrl.funct7 == 0 {
                @<b>|sel_w(ctrl.is_op32, add32, add)|
            } else {
                @<b>|sel_w(ctrl.is_op32, sub32, sub)|
            };
#@end
//}

=== ADD[I]W, SUBW命令をテストする

TODO

== SLL[I]W, SRL[I]W, SRA[I]W命令の実装

RV64Iでは、SLL[I], SRL[I], SRA[I]命令はrs1を0 ~ 63ビットシフトする命令になり、
rs1の下位32ビットを0 ~ 31ビットシフトするSLL[I]W, SRL[I]W, SRA[I]W命令が追加されます。
32ビットの演算結果は符号拡張します。

//image[sllsrlsraw][SLL[I\]W, SRL[I\]W, SRA[I\]W命令のフォーマット @<bib>{isa-manual.1.37}]

SLL[I]W, SRL[I]W, SRA[I]W命令のフォーマットは、
RV32IのSLL[I], SRL[I], SRA[I]命令のopcodeを変えたものと同じです。
SLLW, SRLW, SRAW命令はR形式で、opcodeは@<code>{OP-32}です。
SLLIW, SRLIW, SRAIW命令はI形式で、opcodeは@<code>{OP-IMM-32}です。
どちらのopcodeの命令も、
ADD[I]W, SUBW命令の実装時にデコードが完了しています。

aluモジュールで、シフト演算の結果を生成します。

//list[alu.veryl.shiftw][32ビットのシフト演算をする (alu.veryl)]{
#@maprange(scripts/05/sllsrlsraw-range/core/src/alu.veryl,let)
    let sll32: UInt32 = op1[31:0] << op2[4:0];
    let srl32: UInt32 = op1[31:0] >> op2[4:0];
    let sra32: SInt32 = $signed(op1[31:0]) >>> op2[4:0];
#@end
//}

生成したシフト演算の結果を、@<code>{sel_w}関数で選択するようにします。
case文のシフト演算の部分を次のように変更します。

//list[alu.veryl.shiftw.case][32ビットの演算結果を選択する (alu.veryl)]{
#@maprange(scripts/05/sllsrlsraw-range/core/src/alu.veryl,case)
    3'b001: result = @<b>|sel_w(ctrl.is_op32, sll32, sll)|;
    ...
    3'b101: result = if ctrl.funct7 == 0 {
                @<b>|sel_w(ctrl.is_op32, srl32, srl)|
            } else {
                @<b>|sel_w(ctrl.is_op32, sra32, sra)|
            };
#@end
//}

=== SLL[I]W, SRL[I]W, SRA[I]W命令をテストする

TODO

== LWU命令の実装

LB, LH命令は、ロードした値を符号拡張した値をレジスタに格納します。
これに対して、LBU, LHU命令は、
ロードした値をゼロで拡張した値をレジスタに格納します。

同様に、LW命令は、ロードした値を符号拡張した値をレジスタに格納します。
これに対して、RV64Iでは、
ロードした32ビットの値をゼロで拡張した値をレジスタに格納する
LWU命令が追加されます。

//image[lwu][LWU命令のフォーマット@<bib>{isa-manual.1.37}]

LWU命令はI形式で、opcodeは@<code>{LOAD}です。
ロード, ストア命令はfunct3によって区別することができます。
LWU命令のfunct3は@<code>{110}です。
デコード処理に変更は必要なく、メモリにアクセスする処理を変更する必要があります。

memunitモジュールの、ロードする部分を変換します。
32ビットを@<code>{rdata}に割り当てるとき、
@<code>{sext}によって符号拡張かゼロで拡張するかを選択するようにします。

//list[memunit.veryl.lwu.sext][LWU命令の実装 (memunit.veryl)]{
#@maprange(scripts/05/lwu-range/core/src/memunit.veryl,lwu)
    2'b10  : {@<b>|sext & D[31]| repeat W - 32, D[31:0]},
#@end
//}

=== LWU命令をテストする

TODO

== LD, SD命令の実装

RV64Iには、64ビット単位でロード, ストアを行うLD命令, SD命令が定義されています。

//image[ldsd][LD, SD命令のフォーマット]

LD命令はI形式で、opcodeは@<code>{LOAD}です。
SD命令はS形式で、opcodeは@<code>{STORE}です。
どちらの命令もfunct3は@<code>{011}です。
デコード処理に変更は必要ありません。

=== メモリの幅を広げる

現在のメモリの1つのデータ@<code>{eei::MEM_DATA_WIDTH}の幅は32ビットですが、
このままだと64ビットでロードやストアを行うときに、
最低2回のメモリアクセスが必要になってしまいます。
これを1回のメモリアクセスで済ませるために、
データの幅を32ビットから64ビットに広げます。

//list[eei.veryl.MEM_DATA_WIDTH.expand][MEM_DATA_WIDTHを64ビットに変更する (eei.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/eei.veryl,width)
    const MEM_DATA_WIDTH: u32 = @<b>|64|;
#@end
//}

=== 命令フェッチの対応

@<code>{XLEN}, @<code>{eei::MEM_DATA_WIDTH}が変わっても、
命令の長さ(@<code>{ILEN})は32ビットのままです。

そのため、
topモジュールの@<code>{i_membus.rdata}の幅は32ビット、
@<code>{membus.rdata}は64ビットになり、
@<code>{i_membus.rdata}に@<code>{membus.rdata}の下位32ビットが接続されます。
よって、今のコードのままだとアドレスの下位3ビットが@<code>{100}(=4)であっても、
下位3ビットが@<code>{000}(=0)の命令が@<code>{i_membus.rdata}に割り当てられてしまいます。

正しく命令をフェッチするために、
64ビットの読み出しデータの上位32ビット, 下位32ビットをアドレスの下位ビットで選択します。
PC[2]が0のときは下位32ビット、1のときは上位32ビットを選択します。

まず、命令フェッチの要求のアドレスをレジスタに保存します。

//list[top.veryl.iaddr][アドレスを保存するためのレジスタの定義 (top.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/top.veryl,last_iaddr)
    var memarb_last_i    : logic;
    @<b>|var memarb_last_iaddr: Addr ;|
#@end
//}

//list[top.veryl.always_arb][レジスタに命令フェッチの要求アドレスを保存する (top.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/top.veryl,always_arb)
    // メモリアクセスを調停する
    always_ff {
        if_reset {
            memarb_last_i     = 0;
            @<b>|memarb_last_iaddr = 0;|
        } else {
            if membus.ready {
                memarb_last_i     = !d_membus.valid;
                @<b>|memarb_last_iaddr = i_membus.addr;|
            }
        }
    }
#@end
//}

このレジスタの値を利用し、@<code>{i_membus.rdata}に割り当てる値を選択します。

//list[top.veryl.iaddr_rdata][アドレスによってデータを選択する (top.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/top.veryl,rdata)
    i_membus.rdata  = if memarb_last_iaddr[2] == 0 {
        membus.rdata[31:0]
    } else {
        membus.rdata[63:32]
    };
#@end
//}

=== ストア命令を実装する

SD命令の実装のためには、
書き込むデータ(@<code>{wdata})と書き込みマスク(@<code>{wmask})を変更する必要があります。

//list[memunit.veryl.iaddr_rdata][書き込みデータの変更 (memunit.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/memunit.veryl,wdata)
    req_wdata = rs2 << {addr[@<b>|2|:0], 3'b0};
#@end
//}

書き込むデータは、アドレスの下位2ビットではなく下位3ビット分だけシフトするようにします。

//list[memunit.veryl.iaddr_rdata][書き込みマスクの変更 (memunit.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/memunit.veryl,wmask)
    req_wmask = case ctrl.funct3[1:0] {
        2'b00  : @<b>|8|'b1 << addr[@<b>|2|:0],
        2'b01  : case addr[@<b>|2|:0] {
            @<b>|6      : 8'b11000000,|
            @<b>|4      : 8'b00110000,|
            2      : @<b<|8'b00001100|,
            0      : @<b>|8'b00000011|,
            default: 'x,
        },
        2'b10  : @<b>|case addr[2:0] {|
            @<b>|0      : 8'b00001111,|
            @<b>|4      : 8'b11110000,|
            @<b>|default: 'x,|
        @<b>|},|
        @<b>|2'b11  : 8'b11111111,|
        default: 'x,
    };
#@end
//}

書き込みマスクは8ビットに拡張されます。
それに伴い、アドレスの下位2ビットではなく下位3ビットで選択するようにするようにします。

=== ロード命令の実装

メモリのデータ幅が64ビットに広がるため、
@<code>{rdata}に割り当てる値を、
アドレスの下位2ビットではなく下位3ビットで選択するようにします。

//list[memunit.veryl.rdata][rdataの変更 (memunit.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/memunit.veryl,rdata)
    rdata = case ctrl.funct3[1:0] {
        2'b00  : case addr[@<b>|2|:0] {
            0      : {sext & D[7] repeat W - 8, D[7:0]},
            1      : {sext & D[15] repeat W - 8, D[15:8]},
            2      : {sext & D[23] repeat W - 8, D[23:16]},
            3      : {sext & D[31] repeat W - 8, D[31:24]},
            @<b>|4      : {sext & D[39] repeat W - 8, D[39:32]},|
            @<b>|5      : {sext & D[47] repeat W - 8, D[47:40]},|
            @<b>|6      : {sext & D[55] repeat W - 8, D[55:48]},|
            @<b>|7      : {sext & D[63] repeat W - 8, D[63:56]},|
            default: 'x,
        },
        2'b01  : case addr[@<b>|2|:0] {
            0      : {sext & D[15] repeat W - 16, D[15:0]},
            2      : {sext & D[31] repeat W - 16, D[31:16]},
            @<b>|4      : {sext & D[47] repeat W - 16, D[47:32]},|
            @<b>|6      : {sext & D[63] repeat W - 16, D[63:48]},|
            default: 'x,
        },
        2'b10  : @<b>|case addr[2:0] {|
            @<b>|0      : {sext & D[31] repeat W - 32, D[31:0]},|
            @<b>|4      : {sext & D[63] repeat W - 32, D[63:32]},|
            @<b>|default: 'x,|
        @<b>|},|
        @<b>|2'b11  : D,|
        default: 'x,
    };
#@end
//}


=== LD, SD命令をテストする

TODO


== RV64Iのテスト

TODO