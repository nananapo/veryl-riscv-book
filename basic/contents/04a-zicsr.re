= Zicsr拡張の実装

== CSRとは何か？

前の章では、RISC-Vの基本整数命令セットであるRV32Iを実装しました。
既に簡単なプログラムを動かすことができますが、
例外や割り込み,ページングなどの機能がありません。
このような機能はCSRを利用して提供されます。

RISC-Vには、CSR(Control and Status Register)というレジスタが4096個存在しています。
例えば@<code>{mtvec}というレジスタは、例外や割り込みが発生したときのジャンプ先のアドレスを格納しています。
RISC-VのCPUは、CSRの読み書きによって、制御(Control)や状態(Status)の読み取りを行います。

CSRの読み書きを行う命令は、Zicsr拡張によって定義されています(@<table>{zicsr.insts})。
本章では、Zicsrに定義されている命令,
RV32Iに定義されているECALL命令,
MRET命令,
mtvec/mepc/mcauseレジスタを実装します。

//table[zicsr.insts][Zicsr拡張に定義されている命令]{
命令	作用
-------------------------------------------------------------
CSRRW	CSRにrs1を書き込み、元のCSRの値をrdに書き込む
CSRRWI	CSRRWのrs1を、即値をゼロ拡張した値に置き換えた動作
CSRRS	CSRとrs1をビットORした値をCSRに書き込み、元のCSRの値をrdに書き込む
CSRRSI	CSRRSのrs1を、即値をゼロ拡張した値に置き換えた動作
CSRRC	CSRと~rs1(rs1のビットNOT)をビットANDした値をCSRに書き込み、元のCSRの値をrdに書き込む
CSRRCI	CSRRCのrs1を、即値をゼロ拡張した値に置き換えた動作
//}

== CSRR(W|S|C)[I]命令のデコード

まず、Zicsrに定義されている命令(@<table>{zicsr.insts})をデコードします。

これらの命令のopcodeは@<code>{SYSTEM}(@<code>{1110011})です。
この値をeeiパッケージに定義します。

//list[eei.veryl.system][opcode用の定数の定義 (eei.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/eei.veryl,opcode)
    const OP_SYSTEM: logic<7> = 7'b1110011;
#@end
//}

次に、@<code>{InstCtrl}構造体に、CSRを制御する命令であることを示す@<code>{is_csr}フラグを追加します。

//list[corectrl.veryl.is_csr][is_csrを追加する (corectrl.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/corectrl.veryl,is_csr)
    // 制御に使うフラグ用の構造体
    struct InstCtrl {
        ...
        is_csr  : logic      , // CSR命令である @<balloon>{追加}
        ...
    }
#@end
//}

これでデコード処理を書く準備が整いました。
inst_decoderモジュールの@<code>{InstCtrl}を生成している部分を変更します。

//list[inst_decoder.veryl.decode][OP_SYSTEMとis_csrを追加する (inst_decoder.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/inst_decoder.veryl,decode)
                                           is_csrを追加
    ctrl = {case op {                           ↓
        OP_LUI   : {InstType::U, T, T, F, F, F, F},
        OP_AUIPC : {InstType::U, T, F, F, F, F, F},
        OP_JAL   : {InstType::J, T, F, F, T, F, F},
        OP_JALR  : {InstType::I, T, F, F, T, F, F},
        OP_BRANCH: {InstType::B, F, F, F, F, F, F},
        OP_LOAD  : {InstType::I, T, F, F, F, T, F},
        OP_STORE : {InstType::S, F, F, F, F, F, F},
        OP_OP    : {InstType::R, T, F, T, F, F, F},
        OP_OP_IMM: {InstType::I, T, F, T, F, F, F},
        OP_SYSTEM: {InstType::I, T, F, F, F, F, T}, @<balloon>{追加}
        default  : {InstType::X, F, F, F, F, F, F},
    }, f3, f7};
#@end
//}

上のコードでは、opcodeが@<code>{OP_SYSTEM}な命令を、I形式で、レジスタに結果を書き込み、CSRを操作する命令であるということにしています。
他のopcodeの命令については、CSRを操作しない命令であるということにしています。

CSRRW, CSRRS, CSRRC命令は、rs1レジスタのデータを利用します。
CSRRWI, CSRRSI, CSRRCI命令は、命令のビット中のrs1にあたるビット列(5ビット)をゼロ拡張した値を利用します。
それぞれの命令はfunct3で区別することができます(@<table>{zicsr.f3})。

//table[zicsr.f3][Zicsrに定義されている命令(funct3による区別)]{
funct3	命令	
-------------------------------------------------------------
3'b001	CSRRW
3'b101	CSRRWI
3'b010	CSRRS
3'b110	CSRRSI
3'b011	CSRRC
3'b111	CSRRCI
//}

操作対象のCSRのアドレス(12ビット)は、命令のビットの上位12ビットをそのまま利用します。

== csrunitモジュールの実装

CSRを操作する命令のデコードができたので、
CSR関連の処理を行うcsrunitモジュールを作成します。

=== csrunitモジュールの作成

@<code>{src/csrunit.veryl}を作成し、次のように記述します。

//list[csrunit.veryl.all][csrunit.veryl]{
#@mapfile(scripts/04a/create-csrunit/core/src/csrunit.veryl)
import eei::*;
import corectrl::*;

module csrunit (
    clk     : input  clock       ,
    rst     : input  reset       ,
    valid   : input  logic       ,
    ctrl    : input  InstCtrl    ,
    csr_addr: input  logic   <12>,
    rs1     : input  UIntX       ,
    rdata   : output UIntX       ,
) {
    // CSRR(W|S|C)[I]命令かどうか
    let is_wsc: logic = ctrl.is_csr && ctrl.funct3[1:0] != 0;
}
#@end
//}

csrunitモジュールの主要なポートの定義は次のとおりです。

//table[csrunit.port][csrunitのポート定義]{
ポート名	型			向き	意味
-------------------------------------------------------------
valid		logic		input	命令が供給されているかどうか
ctrl		InstCtrl	input	命令のInstCtrl
csr_addr	logic<12>	input	命令が指定するCSRのアドレス (命令の上位12ビット)
rs1			UIntX		input	CSRR(W|S|C)のときrs1の値、CSRR(W|S|C)Iのとき即値(5ビット)をゼロで拡張した値
rdata		UIntX		output	CSRR(W|S|C)[I]によるCSR読み込みの結果
//}

まだcsrunitモジュールにはCSRが一つもないため、中身が空になっています。

このままの状態で、とりあえず、csrunitモジュールをcoreモジュールの中でインスタンス化します。

//list[core.veryl.csru.inst][csrunitモジュールのインスタンス化 (core.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/core.veryl,csru)
    var csru_rdata: UIntX;

    inst csru: csrunit (
        clk                       ,
        rst                       ,
        valid   : inst_valid      ,
        ctrl    : inst_ctrl       ,
        csr_addr: inst_bits[31:20],
        rs1     : if inst_ctrl.funct3[2] == 1 && inst_ctrl[1:0] != 0 {
            {1'b0 repeat XLEN - $bits(rs1_addr), rs1_addr} // rs1を0で拡張する
        } else {
            rs1_data
        },
        rdata: csru_rdata,
    );
#@end
//}

上のコードでは、結果の受け取りのために@<code>{csru_rdata}レジスタを作成し、
csrunitモジュールをインスタンス化しています。

csr_addrポートには命令の上位12ビットを設定しています。
rs1ポートには、即値を利用する命令(CSRR(W|S|C)I)の場合はrs1_addrを0で拡張した値を、
それ以外の命令の場合はrs1のデータを設定しています。

次に、csrunitの結果をレジスタにライトバックするようにします。
具体的には、@<code>{InstCtrl.is_csr}が@<code>{1}のとき、
@<code>{wb_data}が@<code>{csru_rdata}になるようにします。

//list[core.veryl.csru.wb][CSR命令の結果がライトバックされるようにする (core.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/core.veryl,wb)
    let wb_data: UIntX    = if inst_ctrl.is_jump {
        inst_pc + 4
    } else if inst_ctrl.is_load {
        memu_rdata
    } else if inst_ctrl.is_csr {
        csru_rdata
    } else {
        alu_result
    };
#@end
//}

最後に、デバッグ用の表示を追加します。
デバッグ表示用の@<code>{always_ff}ブロックに次のコードを追加してください。

//list[core.veryl.csru.debug][デバッグ用にrdataを表示するようにする (core.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/core.veryl,debug)
    if inst_ctrl.is_csr {
        $display("  csr rdata : %h", csru_rdata);
    }
#@end
//}

これらのテストは、csrunitモジュールにレジスタを追加してから行います。

=== mtvecレジスタの実装

csrunitモジュールには、まだCSRが定義されていません。
1つ目のCSRとして、mtvecレジスタを実装します。

TODO

=== CSRR(W|S|C)[I]命令の実装

== ECALL命令の実装

=== mcause, mepcレジスタの実装

=== 例外の実装

== MRET命令の実装

