= RV64Iの実装

これまでに、RISC-Vの32ビットの基本整数命令セットであるRV32IのCPUを実装しました。
RISC-Vには64ビットの基本整数命令セットとしてRV64Iが定義されています。
本章では、RV32IのCPUをRV64Iにアップグレードします。

では、具体的にRV32IとRV64Iは何が違うのでしょうか?
まず、RV64IではXLENが32ビットから64ビットに変更され、レジスタの幅や各種演算命令の演算の幅が64ビットになります。
それに伴い、
32ビット幅での整数演算を行う命令、
64ビット幅でロードストアを行う命令が追加されます(@<table>{rv64i.new_insts})。
また、演算の幅が64ビットに広がるだけではなく、
一部の命令の動作が少し変わります(@<table>{rv64i.change})。

//table[rv64i.new_insts][RV64Iで追加される命令]{
命令	動作
-------------------------------------------------------------
ADD[I]W	32ビット単位で加算を行う。結果は符号拡張する
SUBW	32ビット単位で減算を行う。結果は符号拡張する
SLL[I]W	レジスタの値を0 ～ 31ビット左論理シフトする。結果は符号拡張する
SRL[I]W	レジスタの値を0 ～ 31ビット右論理シフトする。結果は符号拡張する
SRA[I]W	レジスタの値を0 ～ 31ビット右算術シフトする。結果は符号拡張する
LWU		メモリから32ビット読み込む。結果はゼロで拡張する
LD		メモリから64ビット読み込む
SD		メモリに64ビット書き込む
//}

//table[rv64i.change][RV64Iで変更される命令]{
命令	変更後の動作
-------------------------------------------------------------
SLL[I]	0 ～ 63ビット左論理シフトする
SRL[I]	0 ～ 63ビット右論理シフトする
SRA[I]	0 ～ 63ビット右算術シフトする
LUI		32ビットの即値を生成する。結果は符号拡張する
AUIPC	32ビットの即値を符号拡張したものにpcを足し合わせる
LW		メモリから32ビット読み込む。結果は符号拡張する
//}

実装のテストにはriscv-testsを利用します。
RV64I向けのテストは@<code>{rv64ui-p-}から始まるテストです。
命令を実装するたびにテストを実行することで、
命令が正しく実行できていることを確認します。

== XLENの変更

レジスタの幅が32ビットから64ビットに変わるということは、
XLENが32から64に変わるということです。
eeiパッケージに定義している@<code>{XLEN}を64に変更します(@<list>{eei.veryl.xlen-shift-range.xlen})。
RV64Iになっても命令の幅(ILEN)は32ビットのままです。

//list[eei.veryl.xlen-shift-range.xlen][XLENを変更する (eei.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/eei.veryl,xlen)
    const XLEN: u32 = @<b>|64|;
#@end
//}

=== SLL[I]、SRL[I]、SRA[I]命令を変更する

RV32Iでは、シフト命令はrs1の値を0 ～ 31ビットシフトする命令として定義されています。
これがRV64Iでは、rs1の値を0 ～ 63ビットシフトする命令に変更されます。

これに対応するために、ALUのシフト演算する量を5ビットから6ビットに変更します
(@<list>{alu.veryl.xlen-shift-range.shift})。
I形式の命令(SLLI、SRLI、SRAI)のときは即値の下位6ビット、
R形式の命令(SLL、SRL、SRA)のときはレジスタの下位6ビットを利用します。

//list[alu.veryl.xlen-shift-range.shift][シフト命令でシフトする量を変更する (alu.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/alu.veryl,shift)
    let sll: UIntX = op1 << op2[@<b>|5|:0];
    let srl: UIntX = op1 >> op2[@<b>|5|:0];
    let sra: SIntX = $signed(op1) >>> op2[@<b>|5|:0];
#@end
//}


=== LUI、AUIPC命令を変更する

RV32Iでは、LUI命令は32ビットの即値をそのままレジスタに格納する命令として定義されています。
これがRV64Iでは、32ビットの即値を64ビットに符号拡張した値を格納する命令に変更されます。
AUIPC命令も同様で、即値にPCを足す前に、即値を64ビットに符号拡張します。

この対応ですが、XLENを64に変更した時点ですでに完了しています(@<list>{inst_decoder.veryl.xlen-shift-range.imm})。
そのため、コードの変更の必要はありません。

//list[inst_decoder.veryl.xlen-shift-range.imm][U形式の即値はXLENビットに拡張されている (inst_decoder.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/inst_decoder.veryl,imm)
    let imm_u: UIntX = {bits[31] repeat XLEN - $bits(imm_u_g) - 12, imm_u_g, 12'b0};
#@end
//}

=== CSRを変更する

MXLEN(=XLEN)が64ビットに変更されると、CSRの幅も64ビットに変更されます。
そのため、mtvec、mepc、mcauseレジスタの幅を64ビットに変更する必要があります。

しかし、mtvec、mepc、mcauseレジスタは
XLENビットのレジスタ(@<code>{UIntX})として定義しているため、
変更の必要はありません。
また、mtvec、mepc、mcauseレジスタはMXLENを基準に定義されており、
RV32IからRV64Iに変わってもフィールドに変化はないため、
対応は必要ありません。

唯一、書き込みマスクの幅を広げる必要があります
(@<list>{csrunit.veryl.xlen-csrunit-range.wmask})。

//list[csrunit.veryl.xlen-csrunit-range.wmask][CSRの書き込みマスクの幅を広げる (csrunit.veryl)]{
#@maprange(scripts/05/xlen-csrunit-range/core/src/csrunit.veryl,wmask)
    const MTVEC_WMASK : UIntX = 'h@<b>|ffff_ffff_|ffff_fffc;
    const MEPC_WMASK  : UIntX = 'h@<b>|ffff_ffff_|ffff_fffc;
    const MCAUSE_WMASK: UIntX = 'h@<b>|ffff_ffff_|ffff_ffff;
#@end
//}

=== LW命令を変更する

LW命令は32ビットの値をロードする命令です。
RV64Iでは、LW命令の結果が64ビットに符号拡張されるようになります。
これに対応するため、memunitモジュールの@<code>{rdata}の割り当てのLW部分を変更します
(@<list>{memunit.veryl.xlen-memunit-range.lw})。

//list[memunit.veryl.xlen-memunit-range.lw][LW命令のメモリの読み込み結果を符号拡張する (memunit.veryl)]{
#@maprange(scripts/05/xlen-memunit-range/core/src/memunit.veryl,lw)
    2'b10  : @<b>|{D[31] repeat W - 32, D[31:0]}|,
#@end
//}

また、XLENが64に変更されたことで、
幅を@<code>{MEM_DATA_WIDTH}(=32)として定義している@<code>{req_wdata}の代入文のビット幅が左右で合わなくなってしまっています。
ビット幅を合わせるために、rs2の下位@<code>{MEM_DATA_WIDTH}ビットだけを切り取ります
(@<list>{memunit.veryl.xlen-memunit-range.req_wdata})。

//list[memunit.veryl.xlen-memunit-range.req_wdata][左辺と右辺でビット幅を合わせる (memunit.veryl)]{
#@maprange(scripts/05/xlen-memunit-range/core/src/memunit.veryl,req_wdata)
    case state {
        State::Init: if is_new & inst_is_memop(ctrl) {
            state     = State::WaitReady;
            req_wen   = inst_is_store(ctrl);
            req_addr  = addr;
            req_wdata = rs2@<b>|[MEM_DATA_WIDTH - 1:0]| << {addr[1:0], 3'b0};
#@end
//}

=== riscv-testsでテストする

==== RV32I向けのテストの実行

まず、RV32I向けのテストが正しく動くことを確認します(@<list>{rv32ui-p.first})。

//terminal[rv32ui-p.first][RV32I向けのテストを実行する]{
$ @<userinput>{make build}
$ @<userinput>{make sim VERILATOR_FLAGS="-DTEST_MODE"}
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv32ui-p-}
...
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srl.bin.hex
Test Result : 40 / 40
//}

RV32I向けのテストにすべて成功しました。
しかし、@<code>{rv32ui-p-ma_data}は失敗するはずです(@<list>{04b-riscvtests|python.test.py})。
これは、riscv-testsのRV32I向けのテストは、
XLENが64のときはテストを実行せずに成功とするためです(@<list>{riscvtests.rv32i.xlen})。

//list[riscvtests.rv32i.xlen][rv32ui-p-addはXLENが64のときにテストせずに成功する (rv32ui-p-add.dump)]{
00000050 <reset_vector>:
 ...
 13c:	00100513          	li	a0,1 @<balloon>{a0 = 1}
 140:	01f51513          	slli	a0,a0,0x1f @<balloon>{a0を31ビット左シフト}
 144:	00054c63          	bltz	a0,15c <reset_vector+0x10c> @<balloon>{a0が0より小さかったらジャンプ}
 148:	0ff0000f          	fence
 14c:	00100193          	li	gp,1 @<balloon>{gp=1 (テスト成功) にする}
 150:	05d00893          	li	a7,93
 154:	00000513          	li	a0,0
 158:	00000073          	ecall @<balloon>{trap_vectorにジャンプして終了}
//}

riscv-testsは、a0に1を代入した後、a0を31ビット左シフトします。
XLENが32のとき、a0の最上位ビット(符号ビット)が1になり、a0は0より小さくなります。
XLENが64のとき、a0の符号は変わらないため、a0は0より大きくなります。
これを利用して、XLENが32ではないときは@<code>{trap_vector}にジャンプして、テスト成功として終了しています。

==== RV64I向けのテストの実行

それでは、RV64I向けのテストを実行します(@<list>{rv64ui-p.xlen})。
RV64I向けのテストは名前が@<code>{rv64ui-p-}から始まります、

//terminal[rv64ui-p.xlen][RV64I向けのテストを実行する]{
$ @<userinput>{make build}
$ @<userinput>{make sim VERILATOR_FLAGS="-DTEST_MODE"}
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv64ui-p-}
...
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
...
Test Result : 14 / 52
//}

ADD命令のテストを含む、ほとんどのテストに失敗してしまいました。
これはriscv-testsのテストが、まだ未実装の命令を含むためです(@<list>{riscvtests.rv64ui-p-add.dump.addiw})。

//list[riscvtests.rv64ui-p-add.dump.addiw][ADD命令のテストは未実装の命令(ADDIW命令)を含む (rv64ui-p-add.dump)]{
0000000000000208 <test_7>:
 208:	00700193          	li	gp,7
 20c:	800005b7          	lui	a1,0x80000
 210:	ffff8637          	lui	a2,0xffff8
 214:	00c58733          	add	a4,a1,a2
 218:	ffff03b7          	lui	t2,0xffff0
 21c:	fff3839b          	@<b>|addiw	t2,t2,-1| # fffffffffffeffff <_end+0xfffffffffffedfff>
 220:	00f39393          	slli	t2,t2,0xf
 224:	46771063          	bne	a4,t2,684 <fail>
//}

ということで、失敗していることを気にせずに実装を進めます。

== ADD[I]W、SUBW命令の実装

RV64Iでは、ADD命令は64ビット単位で演算する命令になり、
32ビットの加算をするADDW命令とADDIW命令が追加されます。
同様に、SUB命令は64ビッド単位の演算になり、
32ビットの減算をするSUBW命令が追加されます。
32ビットの演算結果は符号拡張します。

=== ADD[I]W、SUBW命令をデコードする

//image[addsubw][ADDW、ADDIW、SUBW命令のフォーマット@<bib>{isa-manual.1.37}]

ADDW命令とSUBW命令はR形式で、opcodeは@<code>{OP-32}(@<code>{7'b0111011})です。
ADDIW命令はI形式で、opcodeは@<code>{OP-IMM-32}(@<code>{7'b0011011})です。

まず、eeiパッケージにopcodeの定数を定義します
(@<list>{eei.veryl.addsubw-range.op})。

//list[eei.veryl.addsubw-range.op][opcodeを定義する (eei.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/eei.veryl,op)
    const OP_OP_32    : logic<7> = 7'b0111011;
    const OP_OP_IMM_32: logic<7> = 7'b0011011;
#@end
//}

次に、@<code>{InstCtrl}構造体に、
32ビット単位で演算を行う命令であることを示す@<code>{is_op32}フラグを追加します
(@<list>{corectrl.veryl.addsubw-range.is_op32})。

//list[corectrl.veryl.addsubw-range.is_op32][is_op32を追加する (corectrl.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/corectrl.veryl,is_op32)
    struct InstCtrl {
        itype   : InstType   , // 命令の形式
        rwb_en  : logic      , // レジスタに書き込むかどうか
        is_lui  : logic      , // LUI命令である
        is_aluop: logic      , // ALUを利用する命令である
        @<b>|is_op32 : logic      , // OP-32またはOP-IMM-32である|
        is_jump : logic      , // ジャンプ命令である
        is_load : logic      , // ロード命令である
        is_csr  : logic      , // CSR命令である
        funct3  : logic   <3>, // 命令のfunct3フィールド
        funct7  : logic   <7>, // 命令のfunct7フィールド
    }
#@end
//}

inst_decoderモジュールの@<code>{InstCtrl}と即値を生成している部分を変更します
(
@<list>{inst_decoder.veryl.addsubw-range.ctrl}、
@<list>{inst_decoder.veryl.addsubw-range.imm}
)。
これでデコードは完了です。

//list[inst_decoder.veryl.addsubw-range.ctrl][OP-32、OP-IMM-32のInstCtrlの生成 (inst_decoder.veryl)]{
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
        @<b>|OP_OP_32    : {InstType::R, T, F, T, T, F, F, F},|
        @<b>|OP_OP_IMM_32: {InstType::I, T, F, T, T, F, F, F},|
        OP_SYSTEM   : {InstType::I, T, F, F, @<b>|F|, F, F, T},
        default     : {InstType::X, F, F, F, @<b>|F|, F, F, F},
    }, f3, f7};
#@end
//}

//list[inst_decoder.veryl.addsubw-range.imm][OP-IMM-32の即値の生成 (inst_decoder.veryl)]{
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

=== ALUにADDW、SUBWを実装する

制御フラグを生成できたので、
それに応じて32ビットのADDとSUBを計算します。

まず、32ビットの足し算と引き算の結果を生成します
(@<list>{alu.veryl.addsubw-range.32})。

//list[alu.veryl.addsubw-range.32][32ビットの足し算と引き算をする (alu.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/alu.veryl,32)
    let add32: UInt32 = op1[31:0] + op2[31:0];
    let sub32: UInt32 = op1[31:0] - op2[31:0];
#@end
//}

次に、フラグによって演算結果を選択する関数sel_wを作成します
(@<list>{alu.veryl.addsubw-range.sel})。
この関数は、
@<code>{is_op32}が@<code>{1}なら@<code>{value32}を64ビットに符号拡張した値、
@<code>{0}なら@<code>{value64}を返します。

//list[alu.veryl.addsubw-range.sel][演算結果を選択する関数を作成する (alu.veryl)]{
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

sel_w関数を使用し、aluモジュールの演算処理を変更します。
case文の足し算と引き算の部分を次のように変更します
(@<list>{alu.veryl.addsubw-range.case})。

//list[alu.veryl.addsubw-range.case][32ビットの演算結果を選択する (alu.veryl)]{
#@maprange(scripts/05/addsubw-range/core/src/alu.veryl,case)
    3'b000: result = if ctrl.itype == InstType::I | ctrl.funct7 == 0 {
        @<b>|sel_w(ctrl.is_op32, add32, add)|
    } else {
        @<b>|sel_w(ctrl.is_op32, sub32, sub)|
    };
#@end
//}

=== ADD[I]W、SUBW命令をテストする

RV64I向けのテストを実行して、結果ファイルを確認します
(
@<list>{rv64ui-p.test.addsubw}、
@<list>{results.txt.addsubw}
)。

//terminal[rv64ui-p.test.addsubw][RV64I向けのテストを実行する]{
$ @<userinput>{make build}
$ @<userinput>{make sim VERILATOR_FLAGS="-DTEST_MODE"}
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv64ui-p-}
//}

//list[results.txt.addsubw][テストの実行結果 (results/result.txt)]{
Test Result : 42 / 52
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ld.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-lwu.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sd.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-slliw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sllw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraiw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-srliw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-srlw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-addiw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-addw.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-subw.bin.hex
...
//}

ADDIW、ADDW、SUBWだけでなく、未実装の命令以外のテストにも成功しました。

== SLL[I]W、SRL[I]W、SRA[I]W命令の実装

RV64Iでは、SLL[I]、SRL[I]、SRA[I]命令はrs1を0 ～ 63ビットシフトする命令になり、
rs1の下位32ビットを0 ～ 31ビットシフトするSLL[I]W、SRL[I]W、SRA[I]W命令が追加されます。
32ビットの演算結果は符号拡張します。

//image[sllsrlsraw][SLL[I\]W、SRL[I\]W、SRA[I\]W命令のフォーマット @<bib>{isa-manual.1.37}]

SLL[I]W、SRL[I]W、SRA[I]W命令のフォーマットは、
RV32IのSLL[I]、SRL[I]、SRA[I]命令のopcodeを変えたものと同じです。
SLLW、SRLW、SRAW命令はR形式で、opcodeは@<code>{OP-32}です。
SLLIW、SRLIW、SRAIW命令はI形式で、opcodeは@<code>{OP-IMM-32}です。
どちらのopcodeの命令も、
ADD[I]W命令とSUBW命令の実装時にデコードが完了しています。

aluモジュールで、32ビットのシフト演算の結果を生成します
(@<list>{alu.veryl.sllsrlsraw-range.let})。

//list[alu.veryl.sllsrlsraw-range.let][32ビットのシフト演算をする (alu.veryl)]{
#@maprange(scripts/05/sllsrlsraw-range/core/src/alu.veryl,let)
    let sll32: UInt32 = op1[31:0] << op2[4:0];
    let srl32: UInt32 = op1[31:0] >> op2[4:0];
    let sra32: SInt32 = $signed(op1[31:0]) >>> op2[4:0];
#@end
//}

生成したシフト演算の結果をsel_w関数で選択します。
case文のシフト演算の部分を次のように変更します
(@<list>{alu.veryl.sllsrlsraw-range.case})。

//list[alu.veryl.sllsrlsraw-range.case][32ビットの演算結果を選択する (alu.veryl)]{
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

=== SLL[I]W、SRL[I]W、SRA[I]W命令をテストする


RV64I向けのテストを実行し、結果ファイルを確認します
(@<list>{rv64ui-p.test.sllsrlsraw}、@<list>{results.txt.sllsrlsraw})。

//terminal[rv64ui-p.test.sllsrlsraw][RV64I向けのテストを実行する]{
$ @<userinput>{make build}
$ @<userinput>{make sim VERILATOR_FLAGS="-DTEST_MODE"}
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv64ui-p-}
//}

//list[results.txt.sllsrlsraw][テストの実行結果 (results/result.txt)]{
Test Result : 48 / 52
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ld.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-lwu.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sd.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sll.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-slli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-slliw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sllw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sra.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srai.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraiw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srl.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srliw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srlw.bin.hex
...
//}

SLLW、SLLIW、SRLW、SRLIW、SRAW、SRAIW命令のテストに成功していることを確認できます。

== LWU命令の実装

LB、LH命令は、ロードした値を符号拡張した値をレジスタに格納します。
これに対して、LBU、LHU命令は、
ロードした値をゼロで拡張した値をレジスタに格納します。

同様に、LW命令は、ロードした値を符号拡張した値をレジスタに格納します。
これに対して、RV64Iでは、
ロードした32ビットの値をゼロで拡張した値をレジスタに格納する
LWU命令が追加されます。

//image[lwu][LWU命令のフォーマット@<bib>{isa-manual.1.37}]

LWU命令はI形式で、opcodeは@<code>{LOAD}です。
ロードストア命令はfunct3によって区別できて、LWU命令のfunct3は@<code>{3'b110}です。
デコード処理に変更は必要なく、メモリにアクセスする処理を変更する必要があります。

memunitモジュールの、ロードする部分を変更します。
32ビットを@<code>{rdata}に割り当てるとき、
@<code>{sext}によって符号かゼロで拡張するかを選択します
(@<list>{memunit.veryl.lwu-range.lwu})。

//list[memunit.veryl.lwu-range.lwu][LWU命令の実装 (memunit.veryl)]{
#@maprange(scripts/05/lwu-range/core/src/memunit.veryl,lwu)
    2'b10  : {@<b>|sext & D[31]| repeat W - 32, D[31:0]},
#@end
//}

=== LWU命令をテストする

LWU命令のテストを実行します(@<list>{rv64ui-p-lwu.test})。

//terminal[rv64ui-p-lwu.test][LWU命令をテストする]{
$ @<userinput>{make build}
$ @<userinput>{make sim VERILATOR_FLAGS="-DTEST_MODE"}
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv64ui-p-lwu}
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-lwu.bin.hex
Test Result : 1 / 1
//}

== LD、SD命令の実装

RV64Iには、64ビット単位でロードストアを行うLD命令とSD命令が定義されています。

//image[ldsd][LD、SD命令のフォーマット]

LD命令はI形式で、opcodeは@<code>{LOAD}です。
SD命令はS形式で、opcodeは@<code>{STORE}です。
どちらの命令もfunct3は@<code>{3'b011}です。
デコード処理に変更は必要ありません。

=== メモリの幅を広げる

現在のメモリの1つのデータの幅(@<code>{MEM_DATA_WIDTH})は32ビットですが、
このままだと64ビットでロードやストアを行うときに、
最低2回のメモリアクセスが必要です。
これを1回のメモリアクセスで済ませるために、
データの幅を32ビットから64ビットに広げます
(@<list>{eei.veryl.ldsd-range.width})。

//list[eei.veryl.ldsd-range.width][MEM_DATA_WIDTHを64ビットに変更する (eei.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/eei.veryl,width)
    const MEM_DATA_WIDTH: u32 = @<b>|64|;
#@end
//}

=== 命令フェッチ処理を修正する

@<code>{XLEN}、@<code>{MEM_DATA_WIDTH}が変わっても、
命令の長さ(@<code>{ILEN})は32ビットのままです。
そのため、topモジュールの@<code>{i_membus.rdata}の幅は32ビットなのに対し、
@<code>{membus.rdata}は64ビットになり、ビット幅が一致しません。

ビット幅を合わせて正しく命令をフェッチするために、
64ビットの読み出しデータの上位32ビット、
下位32ビットをアドレスの下位ビットで選択します。
アドレスが8の倍数のときは下位32ビット、
それ以外のときは上位32ビットを選択します。

まず、命令フェッチの要求アドレスをレジスタに格納します
(
@<list>{top.veryl.ldsd-range.last_iaddr}、
@<list>{top.veryl.ldsd-range.always_arb}
)。

//list[top.veryl.ldsd-range.last_iaddr][アドレスを格納するためのレジスタの定義 (top.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/top.veryl,last_iaddr)
    var memarb_last_i    : logic;
    @<b>|var memarb_last_iaddr: Addr ;|
#@end
//}

//list[top.veryl.ldsd-range.always_arb][レジスタに命令フェッチの要求アドレスを格納する (top.veryl)]{
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

このレジスタの値を利用し、
@<code>{i_membus.rdata}に割り当てる値を選択します
(@<list>{top.veryl.ldsd-range.rdata})。

//list[top.veryl.ldsd-range.rdata][アドレスによってデータを選択する (top.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/top.veryl,rdata)
    i_membus.rdata  = if memarb_last_iaddr[2] == 0 {
        membus.rdata[31:0]
    } else {
        membus.rdata[63:32]
    };
#@end
//}

=== SD命令を実装する

SD命令の実装のためには、
書き込むデータ(@<code>{wdata})と書き込みマスク(@<code>{wmask})を変更する必要があります。

書き込むデータはアドレスの下位2ビットではなく下位3ビット分シフトします
(@<list>{memunit.veryl.ldsd-range.wdata})。

//list[memunit.veryl.ldsd-range.wdata][書き込むデータの変更 (memunit.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/memunit.veryl,wdata)
    req_wdata = rs2 << {addr[@<b>|2|:0], 3'b0};
#@end
//}

書き込みマスクは4ビットから8ビットに拡張されるため、
アドレスの下位2ビットではなく下位3ビットで選択します
(@<list>{memunit.veryl.ldsd-range.wmask})。

//list[memunit.veryl.ldsd-range.wmask][書き込みマスクの変更 (memunit.veryl)]{
#@maprange(scripts/05/ldsd-range/core/src/memunit.veryl,wmask)
    req_wmask = case ctrl.funct3[1:0] {
        2'b00  : @<b>|8|'b1 << addr[@<b>|2|:0],
        2'b01  : case addr[@<b>|2|:0] {
            @<b>|6      : 8'b11000000,|
            @<b>|4      : 8'b00110000,|
            2      : @<b>|8'b00001100|,
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

=== LD命令を実装する

メモリのデータ幅が64ビットに広がるため、
@<code>{rdata}に割り当てる値を、
アドレスの下位2ビットではなく下位3ビットで選択します
(@<list>{memunit.veryl.ldsd-range.rdata})。

//list[memunit.veryl.ldsd-range.rdata][rdataの変更 (memunit.veryl)]{
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

=== LD、SD命令をテストする

LD、SD命令のテストを実行する前に、
メモリのデータ単位が4バイトから8バイトになったため、
テストのHEXファイルを4バイト単位の改行から8バイト単位の改行に変更します
(@<list>{hex.8})。

//terminal[hex.8][HEXファイルを8バイト単位に変更する]{
$ @<userinput>{cd test}
$ @<userinput>{find share/ -type f -name "*.bin" -exec sh -c "python3 bin2hex.py 8 {\} > {\}.hex" \;}
//}

riscv-testsを実行します(@<list>{riscv-tests.ldsd})。

//terminal[riscv-tests.ldsd][RV32I、RV64Iをテストする]{
$ @<userinput>{make build}
$ @<userinput>{make sim VERILATOR_FLAGS="-DTEST_MODE"}
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv32ui-p-}
...
Test Result : 40 / 40
$ @<userinput>{python3 test/test.py -r obj_dir/sim test/share rv64ui-p-}
...
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-ld.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sd.bin.hex
...
Test Result : 51 / 52
//}

RV64IのCPUを実装できました。