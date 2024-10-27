= Zicsr拡張の実装

== CSRとは何か?

前の章では、RISC-Vの基本整数命令セットであるRV32Iを実装しました。
既に簡単なプログラムを動かすことができますが、
例外や割り込み、ページングなどの機能がありません@<fn>{sorezore.atode}。
このような機能はCSRを利用して提供されます。

//footnote[sorezore.atode][それぞれの機能は実装するときに解説します]

RISC-Vには、CSR(Control and Status Register)というレジスタが4096個存在しています。
例えば@<code>{mtvec}というレジスタは、例外や割り込みが発生したときのジャンプ先のアドレスを格納しています。
RISC-VのCPUは、CSRの読み書きによって、制御(Control)や状態(Status)の読み取りを行います。

CSRの読み書きを行う命令は、Zicsr拡張によって定義されています(@<table>{zicsr.insts})。
本章では、Zicsrに定義されている命令、
RV32Iに定義されているECALL命令、
MRET命令、
mtvec/mepc/mcauseレジスタを実装します。

//table[zicsr.insts][Zicsr拡張に定義されている命令]{
命令	作用
-------------------------------------------------------------
CSRRW	CSRにrs1を書き込み、元のCSRの値をrdに書き込む
CSRRWI	CSRRWのrs1を、即値をゼロ拡張した値に置き換えた動作
CSRRS	CSRとrs1をビットORした値をCSRに書き込み、元のCSRの値をrdに書き込む
CSRRSI	CSRRSのrs1を、即値をゼロ拡張した値に置き換えた動作
CSRRC	CSRと~rs1(rs1のビットNOT)をビットANDした値をCSRに書き込み、@<br>{}元のCSRの値をrdに書き込む
CSRRCI	CSRRCのrs1を、即値をゼロ拡張した値に置き換えた動作
//}

== CSR命令のデコード

まず、Zicsrに定義されている命令(@<table>{zicsr.insts})をデコードします。

これらの命令のopcodeは@<code>{SYSTEM}(@<code>{7'b1110011})です。
この値をeeiパッケージに定義します(@<list>{eei.veryl.create-csrunit-range.opcode})。

//list[eei.veryl.create-csrunit-range.opcode][opcode用の定数の定義 (eei.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/eei.veryl,opcode)
    const OP_SYSTEM: logic<7> = 7'b1110011;
#@end
//}

次に、@<code>{InstCtrl}構造体に、
CSRを制御する命令であることを示す@<code>{is_csr}フラグを追加します(@<list>{corectrl.veryl.create-csrunit-range.is_csr})。

//list[corectrl.veryl.create-csrunit-range.is_csr][is_csrを追加する (corectrl.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/corectrl.veryl,is_csr)
    // 制御に使うフラグ用の構造体
    struct InstCtrl {
        itype   : InstType   , // 命令の形式
        rwb_en  : logic      , // レジスタに書き込むかどうか
        is_lui  : logic      , // LUI命令である
        is_aluop: logic      , // ALUを利用する命令である
        is_jump : logic      , // ジャンプ命令である
        is_load : logic      , // ロード命令である
        @<b>|is_csr  : logic      , // CSR命令である|
        funct3  : logic   <3>, // 命令のfunct3フィールド
        funct7  : logic   <7>, // 命令のfunct7フィールド
    }
#@end
//}

これでデコード処理を書く準備が整いました。
inst_decoderモジュールの@<code>{InstCtrl}を生成している部分を変更します(@<list>{inst_decoder.veryl.create-csrunit-range.decode})。

//list[inst_decoder.veryl.create-csrunit-range.decode][OP_SYSTEMとis_csrを追加する (inst_decoder.veryl)]{
#@# #@maprange(scripts/04a/create-csrunit-range/core/src/inst_decoder.veryl,decode)
                                         is_csrを追加
    ctrl = {case op {                         ↓
        OP_LUI   : {InstType::U, T, T, F, F, F, @<b>|F|},
        OP_AUIPC : {InstType::U, T, F, F, F, F, @<b>|F|},
        OP_JAL   : {InstType::J, T, F, F, T, F, @<b>|F|},
        OP_JALR  : {InstType::I, T, F, F, T, F, @<b>|F|},
        OP_BRANCH: {InstType::B, F, F, F, F, F, @<b>|F|},
        OP_LOAD  : {InstType::I, T, F, F, F, T, @<b>|F|},
        OP_STORE : {InstType::S, F, F, F, F, F, @<b>|F|},
        OP_OP    : {InstType::R, T, F, T, F, F, @<b>|F|},
        OP_OP_IMM: {InstType::I, T, F, T, F, F, @<b>|F|},
        @<b>|OP_SYSTEM: {InstType::I, T, F, F, F, F, T},|
        default  : {InstType::X, F, F, F, F, F, @<b>|F|},
    }, f3, f7};
#@# #@end
//}

@<list>{inst_decoder.veryl.create-csrunit-range.decode}では、
opcodeが@<code>{OP_SYSTEM}な命令を、
I形式、レジスタに結果を書き込む、CSRを操作する命令であるということにしています。
他のopcodeの命令については、
CSRを操作しない命令であるということにしています。

CSRRW、CSRRS、CSRRC命令は、
rs1レジスタのデータを利用します。
CSRRWI、CSRRSI、CSRRCI命令は、
命令のビット列中のrs1にあたるビット列(5ビット)を@<code>{0}で拡張した値を利用します。
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

操作対象のCSRのアドレス(12ビット)は、
命令のビットの上位12ビット(I形式の即値)をそのまま利用します。

== csrunitモジュールの実装

CSRを操作する命令のデコードができたので、
CSR関連の処理を行うモジュールを作成します。

=== csrunitモジュールを作成する

@<code>{src/csrunit.veryl}を作成し、
次のように記述します(@<list>{csrunit.veryl.create-csrunit})。

//list[csrunit.veryl.create-csrunit][csrunit.veryl]{
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

csrunitモジュールの主要なポートの定義は@<table>{csrunit.port}のとおりです。

//table[csrunit.port][csrunitモジュールのポート定義]{
ポート名	型			向き	意味
-------------------------------------------------------------
valid		logic		input	命令が供給されているかどうか
ctrl		InstCtrl	input	命令のInstCtrl
csr_addr	logic<12>	input	命令が指定するCSRのアドレス (命令の上位12ビット)
rs1			UIntX		input	CSRR(W|S|C)のときrs1の値、@<br>{}CSRR(W|S|C)Iのとき即値(5ビット)をゼロで拡張した値
rdata		UIntX		output	CSR命令よるCSR読み込みの結果
//}

まだ、csrunitモジュールにはCSRが一つもありません。
そのため、中身が空になっています。
このままの状態で、とりあえず、
csrunitモジュールをcoreモジュールの中でインスタンス化します
(@<list>{core.veryl.create-csrunit-range.csru})。

//list[core.veryl.create-csrunit-range.csru][csrunitモジュールのインスタンス化 (core.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/core.veryl,csru)
    var csru_rdata: UIntX;

    inst csru: csrunit (
        clk                       ,
        rst                       ,
        valid   : inst_valid      ,
        ctrl    : inst_ctrl       ,
        csr_addr: inst_bits[31:20],
        rs1     : if inst_ctrl.funct3[2] == 1 && inst_ctrl.funct3[1:0] != 0 {
            {1'b0 repeat XLEN - $bits(rs1_addr), rs1_addr} // rs1を0で拡張する
        } else {
            rs1_data
        },
        rdata: csru_rdata,
    );
#@end
//}

CSR命令の結果の受け取りのために変数@<code>{csru_rdata}を作成し、
csrunitモジュールをインスタンス化しています。

@<code>{csr_addr}ポートには、
命令の上位12ビットを設定しています。
@<code>{rs1}ポートには、
即値を利用する命令(CSRR(W|S|C)I)の場合はrs1_addrを@<code>{0}で拡張した値を、
それ以外の命令の場合は@<code>{rs1}のデータを設定しています。

次に、CSRを読み込んだデータを、
レジスタにライトバックするようにします。
具体的には、
@<code>{InstCtrl.is_csr}が@<code>{1}のとき、
@<code>{wb_data}が@<code>{csru_rdata}になるようにします
(@<list>{core.veryl.create-csrunit-range.wb})。

//list[core.veryl.create-csrunit-range.wb][CSR命令の結果がライトバックされるようにする (core.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/core.veryl,wb)
    let rd_addr: logic<5> = inst_bits[11:7];
    let wb_data: UIntX    = if inst_ctrl.is_lui {
        inst_imm
    } else if inst_ctrl.is_jump {
        inst_pc + 4
    } else if inst_ctrl.is_load {
        memu_rdata
    } @<b>|else if inst_ctrl.is_csr {|
        @<b>|csru_rdata|
    @<b>|}| else {
        alu_result
    };
#@end
//}

最後に、デバッグ用の表示を追加します。
デバッグ表示用のalways_ffブロックに、
次のコードを追加してください(@<list>{core.veryl.create-csrunit-range.debug})。

//list[core.veryl.create-csrunit-range.debug][rdataをデバッグ表示するようにする (core.veryl)]{
#@maprange(scripts/04a/create-csrunit-range/core/src/core.veryl,debug)
    if inst_ctrl.is_csr {
        $display("  csr rdata : %h", csru_rdata);
    }
#@end
//}

これらのテストは、
csrunitモジュールにCSRを追加してから行います。

=== mtvecレジスタを実装する

csrunitモジュールには、まだCSRが定義されていません。
1つ目のCSRとして、mtvecレジスタを実装します。

==== mtvecレジスタ、トラップ

//image[mtvec][mtvecのエンコーディング@<bib>{isa-manual.2.fig10}]

mtvecレジスタは、仕様書@<bib>{isa-manual.2.3.1.7}に定義されています。
mtvecは、MXLENビットのWARLなレジスタです。
mtvecのアドレスは@<code>{12'h305}です。

MXLENはmisaレジスタに定義されていますが、
今のところはXLENと等しいという認識で問題ありません。
WARLはWrite Any Values, Reads Legal Valuesの略です。
その名の通り、好きな値を書き込めるが、
読み出すときには合法な値@<fn>{what.is.legal}になっているという認識で問題ありません。

//footnote[what.is.legal][合法な値とは実装がサポートしている有効な値のことです]

mtvecは、トラップ(Trap)が発生したときのジャンプ先(Trap-Vector)の基準となるアドレスを格納するレジスタです。
@<b>{トラップ}とは、例外(Exception)、または割り込み(Interrupt)により、
CPUの制御を変更することです@<fn>{trap.define}。
トラップが発生する時、CPUはCSRを変更した後、
mtvecに格納されたアドレスにジャンプします。

@<b>{例外}とは、命令の実行によって引き起こされる異常な状態(unusual condition)のことです。
例えば、不正な命令を実行しようとしたときにはIllegal Instruction例外が発生します。
CPUは、例外が発生したときのジャンプ先(対処方法)を決めておくことで、
CPUが異常な状態に陥ったままにならないようにしています。

mtvecはBASEとMODEの2つのフィールドで構成されています。
MODEはジャンプ先の決め方を指定するためのフィールドですが、
簡単のために常に@<code>{2'b00}(Directモード)になるようにします。
Directモードのとき、トラップ時のジャンプ先は@<code>{BASE << 2}になります。

//footnote[trap.define][トラップや例外、割り込みはVolume Iの1.6Exceptions, Traps, and Interruptsに定義されています]

==== mtvecレジスタの実装

それでは、mtvecレジスタを実装します。
まず、CSRのアドレスを表す列挙型を定義します
(@<list>{csrunit.veryl.create-mtvec-range.csr_addr})。

//list[csrunit.veryl.create-mtvec-range.csr_addr][CsrAddr型を定義する (csrunit.veryl)]{
#@maprange(scripts/04a/create-mtvec-range/core/src/csrunit.veryl,csr_addr)
    // CSRのアドレス
    enum CsrAddr: logic<12> {
        MTVEC = 12'h305,
    }
#@end
//}

次に、mtvecレジスタを作成します。
MXLEN=XLENとしているので、
型は@<code>{UIntX}にします
(@<list>{csrunit.veryl.create-mtvec-range.mtvec})。

//list[csrunit.veryl.create-mtvec-range.mtvec][mtvecレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/04a/create-mtvec-range/core/src/csrunit.veryl,mtvec)
    // CSR
    var mtvec: UIntX;
#@end
//}

MODEはDirectモード(@<code>{2'b00})しか対応していません。
mtvecはWARLなレジスタなので、
MODEフィールドには書き込めないようにする必要があります。
これを制御するためにmtvecレジスタの書き込みマスク用の定数を定義します
(@<list>{csrunit.veryl.create-mtvec-range.wmask})。

//list[csrunit.veryl.create-mtvec-range.wmask][mtvecレジスタの書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/04a/create-mtvec-range/core/src/csrunit.veryl,wmask)
    // wmasks
    const MTVEC_WMASK: UIntX = 'hffff_fffc;
#@end
//}

次に、書き込むべきデータ@<code>{wdata}の生成と、
mtvecレジスタの読み込みを実装します(@<list>{csrunit.veryl.create-mtvec-range.rw})。

//list[csrunit.veryl.create-mtvec-range.rw][レジスタの読み込みと書き込むデータの作成 (csrunit.veryl)]{
#@maprange(scripts/04a/create-mtvec-range/core/src/csrunit.veryl,rw)
    var wmask: UIntX; // write mask
    var wdata: UIntX; // write data

     always_comb {
        // read
        rdata = case csr_addr {
            CsrAddr::MTVEC: mtvec,
            default       : 'x,
        };
        // write
        wmask = case csr_addr {
            CsrAddr::MTVEC: MTVEC_WMASK,
            default       : 0,
        };
        wdata = case ctrl.funct3[1:0] {
            2'b01  : rs1,
            2'b10  : rdata | rs1,
            2'b11  : rdata & ~rs1,
            default: 'x,
        } & wmask;
    }
#@end
//}

always_combブロックで、
@<code>{rdata}ポートに@<code>{csr_addr}に応じてCSRの値を割り当てます。
@<code>{wdata}には、CSRに書き込むべきデータを割り当てます。
CSRに書き込むべきデータは、
書き込む命令(CSRRW[I]、CSRRS[I]、CSRRC[I])によって異なります。
@<code>{rs1}ポートには、rs1の値か即値が供給されているため、
これと@<code>{rdata}を利用して@<code>{wdata}を生成しています。
@<code>{funct3}と演算の種類の関係については、
@<table>{zicsr.f3}を参照してください。

最後に、mtvecレジスタへの書き込み処理を実装します。
mtvecへの書き込みは、
命令がCSR命令である場合(@<code>{is_wsc})にのみ行います
(@<list>{csrunit.veryl.create-mtvec-range.always})。

//list[csrunit.veryl.create-mtvec-range.always][CSRへの書き込み処理 (csrunit.veryl)]{
#@maprange(scripts/04a/create-mtvec-range/core/src/csrunit.veryl,always)
    always_ff {
        if_reset {
            mtvec = 0;
        } else {
            if valid {
                if is_wsc {
                    case csr_addr {
                        CsrAddr::MTVEC: mtvec = wdata;
                        default       : {}
                    }
                }
            }
        }
    }
#@end
//}

mtvecの初期値は@<code>{0}です。
mtvecに@<code>{wdata}を書き込むとき、
MODEが常に@<code>{2'b00}になるようにしています。

=== csrunitモジュールをテストする

mtvecレジスタの書き込み、
読み込みができることを確認します。

@<code>{test/sample_csr.hex}を作成し、
次のように記述します(@<list>{sample_csr.hex})。

//list[sample_csr.hex][sample_csr.hex]{
#@mapfile(scripts/04a/create-mtvec/core/test/sample_csr.hex)
305bd0f3 // 0: csrrwi x1, mtvec, 0b10111
30502173 // 4: csrrs  x2, mtvec, x0
#@end
//}

テストでは、
CSRRWI命令でmtvecに@<code>{32'b10111}を書き込んだ後、
CSRRS命令でmtvecの値を読み込んでいます。
CSRRS命令で読み込むとき、
rs1をx0(ゼロレジスタ)にすることで、
mtvecの値を変更せずに読み込んでいます。

シミュレータを実行し、結果を確かめます(@<list>{mtvec.rw.test})。

//terminal[mtvec.rw.test][mtvecの読み込み/書き込みテストの実行]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{./obj_dir/sim test/sample_csr.hex 5}
#                    4
00000000 : 305bd0f3 @<balloon>{mtvecに32'b10111を書き込む}
  itype     : 000010
  rs1[23]   : 00000000 @<balloon>{CSRRWIなので、mtvecに32'b10111(=23)を書き込む}
  csr rdata : 00000000 @<balloon>{mtvecの初期値(0)が読み込まれている}
  reg[ 1] <= 00000000
#                    5
00000004 : 30502173 @<balloon>{mtvecを読み込む}
  itype     : 000010
  csr rdata : 00000014 @<balloon>{mtvecに書き込まれた値を読み込んでいる}
  reg[ 2] <= 00000014 @<balloon>{32'b10111のMODE部分がマスクされて、32'b10100 = 14になっている}
//}

mtvecのBASEフィールドにのみ書き込みが行われ、
@<code>{32'h00000014}が読み込まれることが確認できます。

== ECALL命令の実装

せっかくmtvecレジスタを実装したので、これを使う命令を実装します。

=== ECALL命令とは何か?

RV32Iには、意図的に例外を発生させる命令としてECALL命令が定義されています。
ECALL命令を実行すると、
現在の権限レベル(Privilege Level)に応じて@<table>{ecall.expts}のような例外が発生します。

@<b>{権限レベル}とは、
権限(特権)を持つソフトウェアを実装するための機能です。
例えばOS上で動くソフトウェアは、
セキュリティのために、他のソフトウェアのメモリを侵害できないようにする必要があります。
権限レベル機能があると、このような保護を、
権限のあるOSが権限のないソフトウェアを管理するという風に実現できます。

権限レベルはいくつか定義されていますが、
本章では、最高の権限レベルであるMachineレベル(M-mode)しかないものとします。

//table[ecall.expts][権限レベルとECALLによる例外]{
権限レベル	ECALLによって発生する例外
-------------------------------------------------------------
M			Environment call from M-mode
S			Environment call from S-mode
U			Environment call from U-mode
//}

==== mcause、mepcレジスタ

ECALL命令を実行すると例外が発生します。
例外が発生するとmtvecにジャンプし、例外が発生した時の処理を行います。
これだけでもいいのですが、例外が発生した時に、
どこで(PC)、どのような例外が発生したのかを知りたいことがあります。
これを知るために、RISC-Vには、
どこで例外が発生したかを格納するmepcレジスタと、
例外の発生原因を格納するmcauseレジスタが存在しています。

例外が発生すると、CPUはmtvecにジャンプする前に、
mepcに現在のPCを、mcauseに発生原因を格納します。
これにより、mtvecにジャンプしてから例外に応じた処理を実行することができるようになります。

例外の発生原因は数値で表現されており、
Environment call from M-mode例外には11が割り当てられています。

=== トラップを実装する

それでは、ECALL命令とトラップの仕組みを実装します。

==== 定数の定義

まず、mepcとmcauseのアドレスを@<code>{CsrAddr}型に追加します
(@<list>{csrunit.veryl.create-ecall-range.addr})。

//list[csrunit.veryl.create-ecall-range.addr][mepcとmcauseのアドレスを追加する (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,addr)
    // CSRのアドレス
    enum CsrAddr: logic<12> {
        MTVEC = 12'h305,
        @<b>|MEPC = 12'h341,|
        @<b>|MCAUSE = 12'h342,|
    }
#@end
//}

次に、トラップの発生原因を表現する型@<code>{CsrCause}を定義します。
今のところ、発生原因はECALL命令によるEnvironment Call From M-mode例外しかありません
(@<list>{csrunit.veryl.create-ecall-range.cause})。

//list[csrunit.veryl.create-ecall-range.cause][CsrCause型の定義 (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,cause)
    enum CsrCause: UIntX {
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
    }
#@end
//}

最後に、mepcとmcauseの書き込みマスクを定義します
(@<list>{csrunit.veryl.create-ecall-range.wmask})。
mepcに格納されるのは例外が発生した時の命令のアドレスです。
命令は4バイトに整列して配置されているため、
mepcの下位2ビットは常に@<code>{2'b00}になるようにします。

//list[csrunit.veryl.create-ecall-range.wmask][mepcとmcauseの書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,wmask)
    const MTVEC_WMASK : UIntX = 'hffff_fffc;
    @<b>|const MEPC_WMASK  : UIntX = 'hffff_fffc;|
    @<b>|const MCAUSE_WMASK: UIntX = 'hffff_ffff;|
#@end
//}

==== mepcとmcauseレジスタの実装

mepcとmcauseレジスタを作成します。
サイズはMXLEN(=XLEN)なため、型は@<code>{UIntX}とします
(@<list>{csrunit.veryl.create-ecall-range.reg})。

//list[csrunit.veryl.create-ecall-range.reg][mepcとmcauseレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,reg)
    // CSR
    var mtvec : UIntX;
    @<b>|var mepc  : UIntX;|
    @<b>|var mcause: UIntX;|
#@end
//}

次に、mepcとmcauseの読み込み処理と、書き込みマスクの割り当てを実装します。
どちらもcase文にアドレスと値のペアを追加するだけです
(
@<list>{csrunit.veryl.create-ecall-range.rdata}、
@<list>{csrunit.veryl.create-ecall-range.always_wmask}
)。

//list[csrunit.veryl.create-ecall-range.rdata][mepcとmcauseの読み込み (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,rdata)
    rdata = case csr_addr {
        CsrAddr::MTVEC : mtvec,
        @<b>|CsrAddr::MEPC  : mepc,|
        @<b>|CsrAddr::MCAUSE: mcause,|
        default        : 'x,
    };
#@end
//}

//list[csrunit.veryl.create-ecall-range.always_wmask][mepcとmcauseの書き込みマスクの設定 (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,always_wmask)
    wmask = case csr_addr {
        CsrAddr::MTVEC : MTVEC_WMASK,
        @<b>|CsrAddr::MEPC  : MEPC_WMASK,|
        @<b>|CsrAddr::MCAUSE: MCAUSE_WMASK,|
        default        : 0,
    };
#@end
//}

最後に、mepcとmcauseの書き込みを実装します。
if_resetで値を@<code>{0}に初期化し、case文にmepcとmcauseの場合を実装します
(@<list>{csrunit.veryl.create-ecall-range.always_ff_csr})。

//list[csrunit.veryl.create-ecall-range.always_ff_csr][mepcとmcauseの書き込み (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,always_ff_csr)
always_ff {
    if_reset {
        mtvec  = 0;
        @<b>|mepc   = 0;|
        @<b>|mcause = 0;|
    } else {
        if valid {
            if is_wsc {
                case csr_addr {
                    CsrAddr::MTVEC : mtvec  = wdata;
                    @<b>|CsrAddr::MEPC  : mepc   = wdata;|
                    @<b>|CsrAddr::MCAUSE: mcause = wdata;|
                    default        : {}
                }
            }
        }
    }
}
#@end
//}

==== 例外の実装

いよいよECALL命令と、それによって発生するトラップを実装します。
まず、csrunitモジュールにポートを追加します
(@<list>{csrunit.veryl.create-ecall-range.port})。

//list[csrunit.veryl.create-ecall-range.port][csrunitモジュールにポートを追加する (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,port)
module csrunit (
    clk        : input  clock       ,
    rst        : input  reset       ,
    valid      : input  logic       ,
    @<b>|pc         : input  Addr        ,|
    ctrl       : input  InstCtrl    ,
    @<b>|rd_addr    : input  logic   <5> ,|
    csr_addr   : input  logic   <12>,
    rs1        : input  UIntX       ,
    rdata      : output UIntX       ,
    @<b>|raise_trap : output logic       ,|
    @<b>|trap_vector: output Addr        ,|
) {
#@end
//}

それぞれの用途は次の通りです。

 : pc
	現在処理している命令のアドレスを受け取ります。@<br>{}
	例外が発生した時、mepcにPCを格納するために使います。

 : rd_addr
	現在処理している命令のrdのアドレスを受け取ります。@<br>{}
	現在処理している命令がECALL命令かどうかを判定するために使います。

 : raise_trap
	例外が発生する時、値を@<code>{1}にします。

 : trap_vector
	例外が発生する時、ジャンプ先のアドレスを出力します。

csrunitモジュールの中身を実装する前に、
coreモジュールに、例外発生時の動作を実装します。

csrunitモジュールと接続するための変数を定義し、
csrunitモジュールと接続します
(
@<list>{core.veryl.create-ecall-range.reg}、
@<list>{core.veryl.create-ecall-range.inst}
)。

//list[core.veryl.create-ecall-range.reg][csrunitモジュールのポートの定義を変更する ① (core.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/core.veryl,reg)
    var csru_rdata      : UIntX;
    @<b>|var csru_raise_trap : logic;|
    @<b>|var csru_trap_vector: Addr ;|
#@end
//}

//list[core.veryl.create-ecall-range.inst][csrunitモジュールのポートの定義を変更する ② (core.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/core.veryl,inst)
    inst csru: csrunit (
        clk                       ,
        rst                       ,
        valid   : inst_valid      ,
        @<b>|pc      : inst_pc         ,|
        ctrl    : inst_ctrl       ,
        @<b>|rd_addr                   ,|
        csr_addr: inst_bits[31:20],
        rs1     : if inst_ctrl.funct3[2] == 1 && inst_ctrl.funct3[1:0] != 0 {
            {1'b0 repeat XLEN - $bits(rs1_addr), rs1_addr} // rs1を0で拡張する
        } else {
            rs1_data
        },
        rdata      : csru_rdata,
        @<b>|raise_trap : csru_raise_trap,|
        @<b>|trap_vector: csru_trap_vector,|
    );
#@end
//}

次に、トラップするときに、
トラップ先にジャンプするようにします。

例外が発生する時、
@<code>{csru_raise_trap}が@<code>{1}になり、
@<code>{csru_trap_vector}がトラップ先になります。

トラップするときの動作には、
ジャンプと分岐命令の仕組みを利用します。
@<code>{control_hazard}の条件に@<code>{csru_raise_trap}を追加して、
トラップするときに@<code>{control_hazard_pc_next}を@<code>{csru_trap_vector}に設定します
(@<list>{core.veryl.create-ecall-range.hazard})。

//list[core.veryl.create-ecall-range.hazard][例外の発生時にジャンプするようにする (core.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/core.veryl,hazard)
    assign control_hazard = inst_valid && (
        @<b>{csru_raise_trap ||}
        inst_ctrl.is_jump ||
        inst_is_br(inst_ctrl) && brunit_take
    );
    assign control_hazard_pc_next = @<b>|if csru_raise_trap {|
        @<b>|csru_trap_vector| @<balloon>{トラップするとき、trap_vectorに飛ぶ}
    @<b>|} else |if inst_is_br(inst_ctrl) {
        inst_pc + inst_imm
    } else {
        alu_result
    };
#@end
//}

//image[ecall_enc][ECALL命令のフォーマット@<bib>{isa-manual.1.37}]

それでは、csrunitモジュールにトラップの処理を実装します。

ECALL命令は、
I形式、
即値は@<code>{0}、
rs1とrdは@<code>{0}、
funct3は@<code>{0}、
opcodeは@<code>{SYSTEM}な命令です(@<img>{ecall_enc})。

これを判定するための変数を作成します(@<list>{csrunit.veryl.create-ecall-range.is_ecall})。

//list[csrunit.veryl.create-ecall-range.is_ecall][ecall命令かどうかの判定 (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,is_ecall)
    // ECALL命令かどうか
    let is_ecall: logic = ctrl.is_csr && csr_addr == 0 && rs1[4:0] == 0 && ctrl.funct3 == 0 && rd_addr == 0;
#@end
//}

次に、例外が発生するかどうかを示す@<code>{raise_expt}と、
例外が発生の原因を示す@<code>{expt_cause}を作成します。
今のところ、例外はECALL命令によってのみ発生するため、
@<code>{expt_cause}は実質的に定数になっています
(@<list>{csrunit.veryl.create-ecall-range.expt})。

//list[csrunit.veryl.create-ecall-range.expt][例外とトラップの判定 (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,expt)
    // Exception
    let raise_expt: logic = valid && is_ecall;
    let expt_cause: UIntX = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;

    // Trap
    assign raise_trap  = raise_expt;
    let trap_cause : UIntX = expt_cause;
    assign trap_vector = mtvec;
#@end
//}

トラップが発生するかどうかを示す@<code>{raise_trap}には、
例外が発生するかどうかを割り当てています。
トラップの原因を示す@<code>{trap_cause}には、
例外の発生原因を割り当てています。
また、トラップ先には@<code>{mtvec}を割り当てています。

最後に、トラップに伴うCSRの変更を実装します。
トラップが発生する時、
mepcレジスタにPC、
mcauseレジスタにトラップの発生原因を格納します
(@<list>{csrunit.veryl.create-ecall-range.always_ff_trap})。

//list[csrunit.veryl.create-ecall-range.always_ff_trap][トラップが発生したらCSRを変更する (csrunit.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/csrunit.veryl,always_ff_trap)
always_ff {
    if_reset {
        ...
    } else {
        if valid {
            @<b>|if raise_trap {| @<balloon>{トラップ時の動作}
                @<b>|mepc   = pc;|
                @<b>|mcause = trap_cause;|
            @<b>|} else {|
                if is_wsc {
                    ...
#@end
//}

=== ECALL命令をテストする

ECALL命令をテストする前に、
デバッグのために@<code>{$display}システムタスクで、
例外が発生したかどうかと、
トラップ先を表示します
(@<list>{core.veryl.create-ecall-range.debug})。

//list[core.veryl.create-ecall-range.debug][トラップの情報をデバッグ表示する (core.veryl)]{
#@maprange(scripts/04a/create-ecall-range/core/src/core.veryl,debug)
    if inst_ctrl.is_csr {
        $display("  csr rdata : %h", csru_rdata);
        @<b>|$display("  csr trap  : %b", csru_raise_trap);|
        @<b>|$display("  csr vec   : %h", csru_trap_vector);|
    }
#@end
//}

簡単なテストを記述します。
@<code>{test/sample_ecall.hex}を作成し、
次のように記述します
(@<list>{sample_ecall.hex})。

//list[sample_ecall.hex][sample_ecall.hex]{
#@mapfile(scripts/04a/create-ecall/core/test/sample_ecall.hex)
30585073 //  0: csrrwi x0, mtvec, 0x10
00000073 //  4: ecall
00000000 //  8:
00000000 //  c:
342020f3 // 10: csrrs x1, mcause, x0
34102173 // 14: csrrs x2, mepc, x0
#@end
//}

CSRRW命令でmtvecレジスタに値を書き込み、
ECALL命令で例外を発生させてジャンプします。
ジャンプ先では、
mcauseレジスタとmepcレジスタの値を読み取ります。

シミュレータを実行し、結果を確かめます(@<list>{ecall.test})。

//terminal[ecall.test][ECALL命令のテストの実行]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{./obj_dir/sim test/sample_ecall.hex 10}
#                    4
00000000 : 30585073 @<balloon>{CSRRWIでmtvecに書き込み}
  rs1[16]   : 00000000 @<balloon>{10(=16)をmtvecに書き込む}
  csr trap  : 0
  csr vec   : 00000000
  reg[ 0] <= 00000000
#                    5
00000004 : 00000073
  csr trap  : 1 @<balloon>{ECALL命令により、例外が発生する}
  csr vec   : 00000010 @<balloon>{ジャンプ先は0x10}
  reg[ 0] <= 00000000
#                    9
00000010 : 342020f3
  csr rdata : 0000000b @<balloon>{CSRRSでmcauseを読み込む}
  reg[ 1] <= 0000000b @<balloon>{Environment call from M-modeなのでb(=11)}
#                   10
00000014 : 34102173
  csr rdata : 00000004 @<balloon>{CSRRSでmepcを読み込む}
  reg[ 2] <= 00000004 @<balloon>{例外はアドレス4で発生したので4}
//}

ECALL命令によって例外が発生し、
mcauseとmepcに書き込みが行われてからmtvecにジャンプしていることが確認できます。

ECALL命令の実行時にレジスタに値がライトバックされてしまっていますが、
ECALL命令のrdは常に0番目のレジスタであり、
0番目のレジスタは常に値が@<code>{0}になるため問題ありません。

== MRET命令の実装

MRET命令@<fn>{mret.manual}は、
トラップ先からトラップ元に戻るための命令です。
具体的には、MRET命令を実行すると、
mepcレジスタに格納されたアドレスにジャンプします@<fn>{mret.other}。

MRET命令は、例えば、権限のあるOSから権限のないユーザー空間に戻るために利用します。

//footnote[mret.manual][MRET命令はVolume IIの3.3.2. Trap-Return Instructionsに定義されています]
//footnote[mret.other][他のCSRや権限レベルが実装されている場合は、他にも行うことがあります]

=== MRET命令を実装する

//image[mret_enc][MRET命令のフォーマット@<bib>{isa-manual.2.15}]

まず、
csrunitモジュールに供給されている命令がMRET命令かどうかを判定する変数@<code>{is_mret}を作成します
(@<list>{csrunit.veryl.create-mret-range.is_mret})。
MRET命令は、上位12ビットが@<code>{12'b001100000010}、
rs1は@<code>{0}、funct3は@<code>{0}、rdは@<code>{0}です(@<img>{mret_enc})。

//list[csrunit.veryl.create-mret-range.is_mret][MRET命令の判定 (csrunit.veryl)]{
#@maprange(scripts/04a/create-mret-range/core/src/csrunit.veryl,is_mret)
    // MRET命令かどうか
    let is_mret: logic = ctrl.is_csr && csr_addr == 12'b0011000_00010 && rs1[4:0] == 0 && ctrl.funct3 == 0 && rd_addr == 0;
#@end
//}

次に、
csrunitモジュールにMRET命令が供給されているときに、
mepcにジャンプするようにする仕組みを実装します。
ジャンプするための仕組みには、
トラップによってジャンプする仕組みを利用します
(@<list>{csrunit.veryl.create-mret-range.trap})。

//list[csrunit.veryl.create-mret-range.trap][MRET命令によってジャンプさせる (csrunit.veryl)]{
#@maprange(scripts/04a/create-mret-range/core/src/csrunit.veryl,trap)
    // Trap
    assign raise_trap  = raise_expt @<b>{|| (valid && is_mret)};
    let trap_cause : UIntX = expt_cause;
    assign trap_vector = @<b>|if raise_expt {|
        mtvec
    @<b>|} else {|
        @<b>|mepc|
    @<b>|}|;
#@end
//}

トラップが発生しているかどうかの条件@<code>{raise_mret}に@<code>{is_mret}を追加し、
トラップ先を条件によって変更します。

//note[例外が優先]{
trap_vectorには、
@<code>{is_mret}のときに@<code>{mepc}を割り当てるのではなく、
@<code>{raise_expt}のときに@<code>{mtvec}を割り当てています。
これは、MRET命令によって発生する例外があるからです。
MRET命令の判定を優先すると、例外が発生するのにmepcにジャンプしてしまいます。
//}

=== MRET命令をテストする

MRET命令が正しく動作するかテストします。

mepcに値を設定してからMRET命令を実行することで
mepcにジャンプするようなテストを作成します
(@<list>{sample_mret.hex})。

//list[sample_mret.hex][sample_mret.hex]{
#@mapfile(scripts/04a/create-mret/core/test/sample_mret.hex)
34185073 //  0: csrrwi x0, mepc, 0x10
30200073 //  4: mret
00000000 //  8:
00000000 //  c:
00000013 // 10: addi x0, x0, 0
#@end
//}

シミュレータを実行し、結果を確かめます(@<list>{mret.test})。

//terminal[mret.test][MRET命令のテストの実行]{
$ @<userinput>{make build}
$ @<userinput>{make sim}
$ @<userinput>{./obj_dir/sim test/sample_mret.hex 9}
#                    4
00000000 : 34185073 @<balloon>{CSRRWIでmepcに書き込み}
  rs1[16]   : 00000000 @<balloon>{0x10(=16)をmepcに書き込む}
  csr trap  : 0
  csr vec   : 00000000
  reg[ 0] <= 00000000
#                    5
00000004 : 30200073
  csr trap  : 1 @<balloon>{MRET命令によってmepcにジャンプする}
  csr vec   : 00000010 @<balloon>{10にジャンプする}
#                    9
00000010 : 00000013 @<balloon>{10にジャンプしている}
//}

MRET命令によってmepcにジャンプすることが確認できます。

MRET命令はレジスタに値をライトバックしていますが、
ECALL命令と同じく0番目のレジスタが指定されるため問題ありません。