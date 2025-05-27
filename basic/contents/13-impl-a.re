= A拡張の実装

本章では、メモリの不可分操作を実現するA拡張を実装します。
A拡張にはLoad-Reserved、Store Conditionalを実現するZalrsc拡張(@<link>{a.instructions.zalrsc})、
ロードした値を加工した値をメモリにストアする操作を単一の命令で実装するZaamo拡張(@<link>{a.instructions.zaamo})が含まれています。
A拡張の命令を利用すると、同じメモリ空間で複数のソフトウェアを並列、並行して実行するとき、
ソフトウェア間で同期をとりながら実行できます。

//table{a.instructions.zalrsc}[Zalrsc拡張の命令]{
命令	動作
-------------------------------------------------------------
LR.W/D		メモリから32/64ビット読み込み、予約セットにアドレスを登録する
SC.W/D		予約セットにrs1の値が登録されている場合、メモリにrs2の値を書き込み、0をレジスタにライトバックする@<br>{}予約セットにアドレスが登録されていない場合、メモリに書き込まず、0以外の値をレジスタにライトバックする@<br>{}命令の実行後に予約セットを空にする
//}

//table{a.instructions.zaamo}[Zaamo拡張の命令]{
命令	動作
-------------------------------------------------------------
AMOSWAP.W/D		メモリから32/64ビット読み込み、rs2の値を書き込む
AMOADD.W/D		メモリから32/64ビット(符号付き)読み込み、rs2(符号付き)の値を足して書き込む
AMOAND.W/D		メモリから32/64ビット(符号付き)読み込み、rs2(符号付き)の値をAND演算して書き込む
AMOOR.W/D		メモリから32/64ビット(符号付き)読み込み、rs2(符号付き)の値をOR演算して書き込む
AMOXOR.W/D		メモリから32/64ビット(符号付き)読み込み、rs2(符号付き)の値をXOR演算して書き込む
AMOMIN.W/D		メモリから32/64ビット(符号付き)読み込み、rs2(符号付き)の値と比べて小さい値を書き込む
AMOMAX.W/D		メモリから32/64ビット(符号付き)読み込み、rs2(符号付き)の値と比べて大きい値をを書き込む
AMOMINU.W/D		メモリから32/64ビット(符号無し)読み込み、rs2(符号無し)の値と比べて小さい値を書き込む
AMOMAXU.W/D		メモリから32/64ビット(符号無し)読み込み、rs2(符号無し)の値と比べて大きい値を書き込む
//}

== アトミック操作

=== アトミック操作とは何か？

アトミック操作(Atomic operation、不可分操作)とは、他のシステムからその操作を観測するとき、1つの操作として観測される操作のことです。
つまり、他のシステムは、アトミック操作を行う前、アトミック操作を行った後の状態しか観測できません。

アトミック操作は実行、観測される順序が重要なアプリケーションで利用します。
例えば1からNまでの和を求めるプログラムを考えます(図TODO)。
2つのコアで同時にアドレスX、またはYの値を変更しようとするとき、
命令の実行順序によって最終的な値が1つのコアで実行した場合と異なってしまいます。
この状態を避けるためにはロード、加算、ストアをアトミックに行う必要があります。
このアトミック操作の実現方法として、A拡張はAMOADD命令、LR命令とSC命令を提供します。

=== Zaamo拡張

Zaamo拡張は、値をロードして、演算した値をストアする操作を1つの命令で行う命令を定義しています。
AMOADD命令はロード、加算、ストアを行う単一の命令です。
Zaamo拡張は他の簡単な操作を行う命令も提供しています。

=== Zalrsc拡張

Zalrsc
LR命令とSC命令はそれぞれLoad-Reserved、Store Conditional操作を実現する命令です。
LR、SC命令はそれぞれ次のように動作します。

 : LR命令
   指定されたアドレスのデータを読み込み、指定されたアドレスを予約セット(Reservation set)に登録します。
   ロードしたデータをレジスタにライトバックします。

 : SC命令
   指定されたアドレスが予約セットに存在する場合、指定されたアドレスにデータを書き込みます(ストア成功)。
   予約セットにアドレスが存在しない場合は書き込みません(ストア失敗)。
   ストアに成功したら@<code>{0}、失敗したら@<code>{0}以外の値をレジスタにライトバックします。
   命令の実行後に必ず予約セットを空にします。

LR、SC命令を使うことで、アトミックなロード、加算、ストアを次のように記述できます
(@<list>{sample.asm.lrsc})。

//list[sample.asm.lrsc][LR、SC命令によるアトミックな加算]{
atomic_add:
    LR.W x2, (x3) @<balloon>{アドレスx3の値をx2にロード}
    ADDI x2, x2, 1 @<balloon>{x2に1を足す}
    SC.W x4, x2, (x3) @<balloon>{ストアを試行し、結果をx4に格納}
    BNEZ x4, atomic_add @<balloon>{SC命令が失敗していたらやり直す}
//}

例えば同時に2つのコアが@<list>{sample.asm.lrsc}を実行するとき、同期をとれていない書き込みはSC命令で失敗します。
失敗したらLR命令からやり直すことで、1つのコアで2回実行した場合と同一の結果(@<code>{1}を2回加算)になります。

予約セットのサイズは実装によって異なります。

=== 命令の順序

A拡張の命令のビット列は、それぞれ1ビットのaq、rlビットを含んでいます。
このビットは、他のコアやハードウェアスレッドからメモリ操作を観測したときにメモリ操作がどのような順序で観測されるかを制御するものです。

A拡張の命令をAとするとき、それぞれのビットの状態に応じて、Aによるメモリ操作は次のように観測されます。

 : aq=0、rl=0
    Aの前後でメモリ操作の順序は保証されません。
 : aq=1、rl=0
    Aの後ろにあるメモリを操作する命令は、Aのメモリ操作の後に観測されることが保証されます。
 : aq=0、rl=0
    Aのメモリ操作は、Aの前にあるメモリを操作する命令が観測できるようになった後に観測されることが保証されます。
 : aq=1、rl=1
    Aのメモリ操作は、Aの前にあるメモリを操作する命令よりも後、Aの後ろにあるメモリを操作する命令よりも前に観測されることが保証されます。

#@# TODO 余裕があればaqrlそれぞれの図

今のところ、CPUはメモリ操作を１命令ずつ直列に実行するため、常にaqが@<code>{1}、rlが@<code>{1}であるように動作します。
そのため、本章ではaq、rlビットを考慮しないで実装を行います@<fn>{impl-memory-order}。

//footnote[impl-memory-order][メモリ操作の並び替えによる高速化は応用編で検討します。]

== 命令のデコード

#@# TODO 余裕があれば 命令の図

A拡張の命令はすべてR形式で、opcodeはOP-AMO(@<code>{7'b0101111})です。
それぞれの命令はfunct5とfunct3で区別できます(@<link>{a.instructions.funct5})。

//table{a.instructions.funct5}[A拡張の命令のfunct5]{
funct5		命令
-------------------------------------------------------------
5'b00010	LR.W/D
5'b00011	SC.W/D
5'b00001	AMOSWAP.W/D
5'b00000	AMOADD.W/D
5'b00100	AMOXOR.W/D
5'b01100	AMOAND.W/D
5'b01000	AMOOR.W/D
5'b10000	AMOMIN.W/D
5'b10100	AMOMAX.W/D
5'b11000	AMOMINU.W/D
5'b11100	AMOMAXU.W/D
//}

eeiパッケージにOP-AMOの定数を定義します
(@<list>{eei.veryl.define.op})。

//list[eei.veryl.define.op][OP-AMOの定義 (eei.veryl)]{
#@maprange(scripts/13/define-range/core/src/eei.veryl,op)
    const OP_AMO      : logic<7> = 7'b0101111;
#@end
//}

また、A拡張の命令を区別するための列挙型@<code>{AMOOp}を定義します
(@<list>{eei.veryl.define.AMOOp})。
それぞれ、命令のfunct5と対応していることを確認してください。

//list[eei.veryl.define.AMOOp][AMOOp型の定義 (eei.veryl)]{
#@maprange(scripts/13/define-range/core/src/eei.veryl,AMOOp)
    enum AMOOp: logic<5> {
        LR = 5'b00010,
        SC = 5'b00011,
        SWAP = 5'b00001,
        ADD = 5'b00000,
        XOR = 5'b00100,
        AND = 5'b01100,
        OR = 5'b01000,
        MIN = 5'b10000,
        MAX = 5'b10100,
        MINU = 5'b11000,
        MAXU = 5'b11100,
    }
#@end
//}

=== is_amoフラグを実装する

@<code>{InstCtrl}構造体に、
A拡張の命令であることを示す@<code>{is_amo}フラグを追加します 
(@<list>{corectrl.veryl.define.is_amo})。

//list[corectrl.veryl.define.is_amo][InstCtrlにis_amoを定義する (corectrl.veryl)]{
#@maprange(scripts/13/define-range/core/src/corectrl.veryl,is_amo)
    struct InstCtrl {
        itype    : InstType   , // 命令の形式
        rwb_en   : logic      , // レジスタに書き込むかどうか
        is_lui   : logic      , // LUI命令である
        is_aluop : logic      , // ALUを利用する命令である
        is_muldiv: logic      , // M拡張の命令である
        is_op32  : logic      , // OP-32またはOP-IMM-32である
        is_jump  : logic      , // ジャンプ命令である
        is_load  : logic      , // ロード命令である
        is_csr   : logic      , // CSR命令である
        @<b>|is_amo   : logic      , // AMO instruction|
        funct3   : logic   <3>, // 命令のfunct3フィールド
        funct7   : logic   <7>, // 命令のfunct7フィールド
    }
#@end
//}

命令がメモリにアクセスするかを判定するinst_is_memop関数を、@<code>{is_amo}フラグを利用するように変更します
(@<list>{corectrl.veryl.define.inst_is_memop})。

//list[corectrl.veryl.define.inst_is_memop][A拡張の命令がメモリにアクセスする命令と判定する (corectrl.veryl)]{
#@maprange(scripts/13/define-range/core/src/corectrl.veryl,inst_is_memop)
    function inst_is_memop (
        ctrl: input InstCtrl,
    ) -> logic {
        return ctrl.itype == InstType::S || ctrl.is_load @<b>{|| ctrl.is_amo};
    }
#@end
//}

inst_decoderモジュールの@<code>{InstCtrl}を生成している部分を変更します。
opcodeが@<code>{OP-AMO}のとき、@<code>{is_amo}を@<code>{T}に設定します
(@<list>{inst_decoder.veryl.define.ctrl})。
その他のopcodeの@<code>{is_amo}は@<code>{F}に設定してください。

//list[inst_decoder.veryl.define.ctrl][is_amoフラグを追加する (inst_decoder.veryl)]{
#@maprange(scripts/13/define-range/core/src/inst_decoder.veryl,ctrl)
                OP_SYSTEM: {
                    InstType::I, T, F, F, F, F, F, F, T@<b>|, F|
                },
                OP_AMO: {
                    InstType::R, T, F, F, F, F, F, F, F@<b>|, T|
                },
                default: {
                    InstType::X, F, F, F, F, F, F, F, F@<b>|, F|
                },
#@end
//}

また、A拡張の命令が有効な命令として判断されるようにします
(@<list>{inst_decoder.veryl.define.valid})。

//list[inst_decoder.veryl.define.valid][A拡張の命令のとき、validフラグを立てる (inst_decoder.veryl)]{
#@maprange(scripts/13/define-range/core/src/inst_decoder.veryl,valid)
            OP_MISC_MEM: T, // FENCE
            @<b>{OP_AMO     : f3 == 3'b010 || f3 == 3'b011, // AMO}
            default    : F,
#@end
//}

=== アドレスを変更する

A拡張でアクセスするメモリのアドレスはrs1で指定されたレジスタの値です。
これは基本整数命令セットのロードストア命令のアドレス指定方法(rs1と即値を足し合わせる)とは異なるため、
memunitモジュールの@<code>{addr}ポートに割り当てる値を@<code>{is_amo}フラグによって切り替えます
(@<list>{core.veryl.define.memu_addr})。

//list[core.veryl.define.memu_addr][メモリアドレスをrs1レジスタの値にする (core.veryl)]{
#@maprange(scripts/13/define-range/core/src/core.veryl,memu_addr)
    var memu_rdata: UIntX;
    var memu_stall: logic;
    @<b>|let memu_addr : Addr  = if mems_ctrl.is_amo ? memq_rdata.rs1_data : memq_rdata.alu_result;|

    inst memu: memunit (
        clk                                   ,
        rst                                   ,
        valid : mems_valid && !mems_expt.valid,
        is_new: mems_is_new                   ,
        ctrl  : mems_ctrl                     ,
        @<b>|addr  : memu_addr                     ,|
        rs2   : memq_rdata.rs2_data           ,
        rdata : memu_rdata                    ,
        stall : memu_stall                    ,
        membus: d_membus                      ,
    );
#@end
//}


A拡張の命令のメモリアドレスが、
操作するデータの幅に整列されていないとき、
Store/AMO address misaligned例外が発生します。
この例外はストア命令の場合の例外と同じです。

EXステージの例外判定でアドレスを使っている部分を変更します
(@<list>{core.veryl.define.exception})。
causeとtvalの割り当てがストア命令の場合と同じになっていることを確認してください。

//list[core.veryl.define.exception][例外を判定するアドレスを変更する (core.veryl)]{
#@maprange(scripts/13/define-range/core/src/core.veryl,exception)
        @<b>|let memaddr                       : Addr  = if exs_ctrl.is_amo ? exs_rs1_data : exs_alu_result;|
        let loadstore_address_misaligned  : logic = inst_is_memop(exs_ctrl) && case exs_ctrl.funct3[1:0] {
            2'b00  : 0, // B
            2'b01  : @<b>|memaddr|[0] != 1'b0, // H
            2'b10  : @<b>|memaddr|[1:0] != 2'b0, // W
            2'b11  : @<b>|memaddr|[2:0] != 3'b0, // D
            default: 0,
        };
#@end
//}

=== ライトバックする条件を変更する

A拡張の命令を実行するとき、
ロードした値をレジスタにライトバックするように変更します
(@<list>{core.veryl.define.wb_data})。

//list[core.veryl.define.wb_data][メモリからロードした値をライトバックする (core.veryl)]{
#@maprange(scripts/13/define-range/core/src/core.veryl,wb_data)
    let wbs_wb_data: UIntX    = if wbs_ctrl.is_lui ?
        wbs_imm
    : if wbs_ctrl.is_jump ?
        wbs_pc + 4
    : if wbs_ctrl.is_load @<b>{|| wbs_ctrl.is_amo} ?
        wbq_rdata.mem_rdata
    : if wbs_ctrl.is_csr ?
#@end
//}

== amounitモジュールの作成

#@# TODO 余裕があれば図

A拡張は他のコア、ハードウェアスレッドと同期してメモリ操作を行うためのものであるため、
A拡張の操作はcoreモジュールの外、メモリよりも前で行います。
本書では、coreモジュールとmmio_controllerモジュールの間にA拡張の命令を処理するamounitモジュールを実装します。

=== インターフェースを作成する

amounitモジュールにA拡張の操作を指示するために、
@<code>{is_amo}フラグ、@<code>{aq}ビット、@<code>{rl}ビット、@<code>{AMOOp}型をmembus_ifインターフェースに追加で定義したインターフェースを作成します。

@<code>{src/core_data_if.veryl}を作成し、次のように記述します
(@<list>{core_data_if.veryl.empty.all})。

//list[core_data_if.veryl.empty.all][core_data_if.veryl]{
#@mapfile(scripts/13/empty-range/core/src/core_data_if.veryl)
import eei::*;

interface core_data_if {
    var valid : logic                       ;
    var ready : logic                       ;
    var addr  : logic<XLEN>                 ;
    var wen   : logic                       ;
    var wdata : logic<MEMBUS_DATA_WIDTH>    ;
    var wmask : logic<MEMBUS_DATA_WIDTH / 8>;
    var rvalid: logic                       ;
    var rdata : logic<MEMBUS_DATA_WIDTH>    ;

    var is_amo: logic   ;
    var aq    : logic   ;
    var rl    : logic   ;
    var amoop : AMOOp   ;
    var funct3: logic<3>;

    modport master {
        valid : output,
        ready : input ,
        addr  : output,
        wen   : output,
        wdata : output,
        wmask : output,
        rvalid: input ,
        rdata : input ,
        is_amo: output,
        aq    : output,
        rl    : output,
        amoop : output,
        funct3: output,
    }

    modport slave {
        ..converse(master)
    }

    modport all_input {
        ..input
    }
}
#@end
//}

=== amounitモジュールの作成

メモリ操作をcoreモジュールからそのままmmio_controllerモジュールに受け渡しするだけのモジュールを作成します。
@<code>{src/amounit.veryl}を作成し、次のように記述します
(@<list>{amounit.veryl.empty.all})。

//list[amounit.veryl.empty.all][amounit.veryl]{
#@mapfile(scripts/13/empty-range/core/src/amounit.veryl)
import eei::*;

module amounit (
    clk   : input   clock              ,
    rst   : input   reset              ,
    slave : modport core_data_if::slave,
    master: modport Membus::master     ,
) {

    enum State {
        Init,
        WaitReady,
        WaitValid,
    }

    var state      : State;
    inst slave_saved: core_data_if;

    // masterをリセットする
    function reset_master () {
        master.valid = 0;
        master.addr  = 0;
        master.wen   = 0;
        master.wdata = 0;
        master.wmask = 0;
    }

    // masterに要求を割り当てる
    function assign_master (
        addr : input Addr                   ,
        wen  : input logic                  ,
        wdata: input UIntX                  ,
        wmask: input logic<$size(UIntX) / 8>,
    ) {
        master.valid = 1;
        master.addr  = addr;
        master.wen   = wen;
        master.wdata = wdata;
        master.wmask = wmask;
    }

    // 新しく要求を受け入れる
    function accept_request_comb () {
        if slave.ready && slave.valid {
            assign_master(slave.addr, slave.wen, slave.wdata, slave.wmask);
        }
    }

    // slaveに結果を割り当てる
    always_comb {
        slave.ready  = 0;
        slave.rvalid = 0;
        slave.rdata  = 0;

        case state {
            State::Init: {
                slave.ready = 1;
            }
            State::WaitValid: {
                slave.ready  = master.rvalid;
                slave.rvalid = master.rvalid;
                slave.rdata  = master.rdata;
            }
            default: {}
        }
    }

    // masterに要求を割り当てる
    always_comb {
        reset_master();
        case state {
            State::Init     : accept_request_comb();
            State::WaitReady: {
                assign_master(slave_saved.addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
            }
            State::WaitValid: accept_request_comb();
            default         : {}
        }
    }

    // 新しく要求を受け入れる
    function accept_request_ff () {
        slave_saved.valid = slave.ready && slave.valid;
        if slave.ready && slave.valid {
            slave_saved.addr   = slave.addr;
            slave_saved.wen    = slave.wen;
            slave_saved.wdata  = slave.wdata;
            slave_saved.wmask  = slave.wmask;
            slave_saved.is_amo = slave.is_amo;
            slave_saved.amoop  = slave.amoop;
            slave_saved.aq     = slave.aq;
            slave_saved.rl     = slave.rl;
            slave_saved.funct3 = slave.funct3;
            state              = if master.ready ? State::WaitValid : State::WaitReady;
        } else {
            state = State::Init;
        }
    }

    function on_clock () {
        case state {
            State::Init     : accept_request_ff();
            State::WaitReady: if master.ready {
                state = State::WaitValid;
            }
            State::WaitValid: if master.rvalid {
                accept_request_ff();
            }
            default: {}
        }
    }

    function on_reset () {
        state              = State::Init;
        slave_saved.addr   = 0;
        slave_saved.wen    = 0;
        slave_saved.wdata  = 0;
        slave_saved.wmask  = 0;
        slave_saved.is_amo = 0;
        slave_saved.amoop  = 0 as AMOOp;
        slave_saved.aq     = 0;
        slave_saved.rl     = 0;
        slave_saved.funct3 = 0;
    }

    always_ff {
        if_reset {
            on_reset();
        } else {
            on_clock();
        }
    }
}
#@end
//}

amounitモジュールは
@<code>{State::Init}、
(@<code>{State::WaitReady}、)
@<code>{State::WaitValid}の順に状態を移動し、
通常のロードストア命令を処理します。

coreモジュールのロードストア用のインターフェースをmembus_ifからcore_data_ifに変更します
(@<list>{core.veryl.empty.port}、
@<list>{top.veryl.empty.port}、
@<list>{top.veryl.empty.core})。

//list[core.veryl.empty.port][d_membusの型を変更する (core.veryl)]{
#@maprange(scripts/13/empty-range/core/src/core.veryl,port)
    i_membus: modport membus_if::<ILEN, XLEN>::master,
    d_membus: modport @<b>|core_data_if|::master           ,
    led     : output  UIntX                          ,
#@end
//}

//list[top.veryl.empty.port][core_data_ifインターフェースのインスタンス化 (top.veryl)]{
#@maprange(scripts/13/empty-range/core/src/top.veryl,d_membus_core)
    inst d_membus_core: core_data_if;
#@end
//}

//list[top.veryl.empty.core][ポート名に割り当てるインターフェースを変更する (top.veryl)]{
#@maprange(scripts/13/empty-range/core/src/top.veryl,core)
    inst c: core (
        clk                    ,
        rst                    ,
        i_membus               ,
        @<b>|d_membus: d_membus_core,|
        led                    ,
    );
#@end
//}

memunitモジュールのインターフェースも変更し、
@<code>{is_amo}、@<code>{aq}、@<code>{rl}、@<code>{amoop}に値を割り当てます
(@<list>{memunit.veryl.empty.port}、
@<list>{memunit.veryl.empty.reg}、
@<list>{memunit.veryl.empty.assign}、
@<list>{memunit.veryl.empty.reset}、
@<list>{memunit.veryl.empty.Init})。

//list[memunit.veryl.empty.port][membusの型を変更する (memunit.veryl)]{
#@maprange(scripts/13/empty-range/core/src/memunit.veryl,port)
    stall : output  logic               , // メモリアクセス命令が完了していない
    membus: modport @<b>|core_data_if|::master, // メモリとのinterface
) {
#@end
//}

//list[memunit.veryl.empty.reg][一時保存するレジスタの定義 (memunit.veryl)]{
#@maprange(scripts/13/empty-range/core/src/memunit.veryl,reg)
    var req_wen   : logic                       ;
    var req_addr  : Addr                        ;
    var req_wdata : logic<MEMBUS_DATA_WIDTH>    ;
    var req_wmask : logic<MEMBUS_DATA_WIDTH / 8>;
    @<b>|var req_is_amo: logic                       ;|
    @<b>|var req_amoop : AMOOp                       ;|
    @<b>|var req_aq    : logic                       ;|
    @<b>|var req_rl    : logic                       ;|
    @<b>|var req_funct3: logic<3>                    ;|
#@end
//}

//list[memunit.veryl.empty.reset][レジスタをリセットする (memunit.veryl)]{
#@maprange(scripts/13/empty-range/core/src/memunit.veryl,reset)
    always_ff {
        if_reset {
            state      = State::Init;
            req_wen    = 0;
            req_addr   = 0;
            req_wdata  = 0;
            req_wmask  = 0;
            @<b>|req_is_amo = 0;|
            @<b>|req_amoop  = 0 as AMOOp;|
            @<b>|req_aq     = 0;|
            @<b>|req_rl     = 0;|
            @<b>|req_funct3 = 0;|
        } else {
#@end
//}

//list[memunit.veryl.empty.assign][membusにレジスタの値を割り当てる (memunit.veryl)]{
#@maprange(scripts/13/empty-range/core/src/memunit.veryl,assign)
    always_comb {
        // メモリアクセス
        membus.valid  = state == State::WaitReady;
        membus.addr   = req_addr;
        membus.wen    = req_wen;
        membus.wdata  = req_wdata;
        membus.wmask  = req_wmask;
        @<b>|membus.is_amo = req_is_amo;|
        @<b>|membus.amoop  = req_amoop;|
        @<b>|membus.aq     = req_aq;|
        @<b>|membus.rl     = req_rl;|
        @<b>|membus.funct3 = req_funct3;|
#@end
//}

//list[memunit.veryl.empty.Init][メモリにアクセスする命令のとき、レジスタに情報を設定する (memunit.veryl)]{
#@maprange(scripts/13/empty-range/core/src/memunit.veryl,Init)
                case state {
                    State::Init: if is_new & inst_is_memop(ctrl) {
                        ...
                        @<b>|req_is_amo = ctrl.is_amo;|
                        @<b>|req_amoop  = ctrl.funct7[6:2] as AMOOp;|
                        @<b>|req_aq     = ctrl.funct7[1];|
                        @<b>|req_rl     = ctrl.funct7[0];|
                        @<b>|req_funct3 = ctrl.funct3;|
                    }
                    State::WaitReady: if membus.ready {
#@end
//}

amounitモジュールをtopモジュールでインスタンス化し、
coreモジュールとmmio_controllerモジュールのインターフェースを接続します
(@<list>{top.veryl.empty.amou})。

//list[top.veryl.empty.amou][amounitモジュールをインスタンス化する (top.veryl)]{
#@maprange(scripts/13/empty-range/core/src/top.veryl,amou)
    inst amou: amounit (
        clk                  ,
        rst                  ,
        slave : d_membus_core,
        master: d_membus     ,
    );
#@end
//}

== Zalrsc拡張の実装

予約セットのサイズは実装が自由に決めることができるため、
本書では1つのアドレスのみ保持できるようにします。

=== LR.W、LR.D命令を実装する

32ビット幅、64ビット幅のLR命令を実装します。
LR.W命令はmemunitモジュールで64ビットに符号拡張されるため、
amounitモジュールでLR.W命令とLR.D命令を区別する必要はありません。

amounitモジュールに予約セットを作成します
(@<list>{amounit.veryl.lr.list}、
@<list>{amounit.veryl.lr.reset})。
@<code>{is_addr_reserved}で、予約セットに有効なアドレスが格納されているかを管理します。

//list[amounit.veryl.lr.list][予約セットの定義 (amounit.veryl)]{
#@maprange(scripts/13/lr-range/core/src/amounit.veryl,list)
    // lr/sc
    var is_addr_reserved: logic;
    var reserved_addr   : Addr ;
#@end
//}

//list[amounit.veryl.lr.reset][レジスタをリセットする (amounit.veryl)]{
#@maprange(scripts/13/lr-range/core/src/amounit.veryl,reset)
        is_addr_reserved   = 0;
        reserved_addr      = 0;
#@end
//}

LR命令を実行するとき、予約セットにアドレスを登録してロード結果を返すようにします
(@<list>{amounit.veryl.lr.accept_request_comb}、
@<list>{amounit.veryl.lr.master_comb}、
@<list>{amounit.veryl.lr.accept_request_ff})。
既に予約セットが使われている場合はアドレスを上書きします。

//list[amounit.veryl.lr.accept_request_comb][accept_request_comb関数の実装 (amounit.veryl)]{
#@maprange(scripts/13/lr-range/core/src/amounit.veryl,accept_request_comb)
    function accept_request_comb () {
        if slave.ready && slave.valid {
            @<b>|if slave.is_amo {|
            @<b>|    case slave.amoop {|
            @<b>|        AMOOp::LR: assign_master(slave.addr, 0, 0, 0);|
            @<b>|        default  : {}|
            @<b>|    }|
            @<b>|} else {|
                assign_master(slave.addr, slave.wen, slave.wdata, slave.wmask);
            @<b>|}|
        }
    }
#@end
//}

//list[amounit.veryl.lr.master_comb][LR命令のときにmasterにロード要求を割り当てる (amounit.veryl)]{
#@maprange(scripts/13/lr-range/core/src/amounit.veryl,master_comb)
    always_comb {
        reset_master();
        case state {
            State::Init     : accept_request_comb();
            @<b>|State::WaitReady: if slave_saved.is_amo {|
            @<b>|    case slave_saved.amoop {|
            @<b>|        AMOOp::LR: assign_master(slave_saved.addr, 0, 0, 0);|
            @<b>|        default  : {}|
            @<b>|    }|
            @<b>|} else {|
                assign_master(slave_saved.addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
            @<b>|}|
#@end
//}

//list[amounit.veryl.lr.accept_request_ff][LR命令のときに予約セットを設定する (amounit.veryl)]{
#@maprange(scripts/13/lr-range/core/src/amounit.veryl,accept_request_ff)
    function accept_request_ff () {
        slave_saved.valid = slave.ready && slave.valid;
        if slave.ready && slave.valid {
            slave_saved.addr   = slave.addr;
            ...
            slave_saved.funct3 = slave.funct3;
            @<b>|if slave.is_amo {|
            @<b>|    case slave.amoop {|
            @<b>|        AMOOp::LR: {|
            @<b>|            // reserve address|
            @<b>|            is_addr_reserved = 1;|
            @<b>|            reserved_addr    = slave.addr;|
            @<b>|            state            = if master.ready ? State::WaitValid : State::WaitReady;|
            @<b>|        }|
            @<b>|        default: {}|
            @<b>|    }|
            @<b>|} else {|
                state = if master.ready ? State::WaitValid : State::WaitReady;
            @<b>|}|
#@end
//}

=== SC.W、SC.D命令を実装する

32ビット幅、64ビット幅のSC命令を実装します。
SC.W命令はmemunitモジュールで書き込みマスクを設定しているため、
amounitモジュールでSC.W命令とSC.D命令を区別する必要はありません。

SC命令が成功、失敗したときに結果を返すための状態を@<code>{State}型に追加します
(@<list>{amounit.veryl.sc.State})。

//list[amounit.veryl.sc.State][SC命令用の状態の定義 (amounit.veryl)]{
#@maprange(scripts/13/sc-range/core/src/amounit.veryl,State)
    enum State {
        Init,
        WaitReady,
        WaitValid,
        @<b>|SCSuccess,|
        @<b>|SCFail,|
    }
#@end
//}

それぞれの状態で結果を返し、新しく要求を受け入れるようにします
(@<list>{amounit.veryl.sc.assign_slave})。
@<code>{State::SCSuccess}はSC命令に成功してストアが終わったときに結果を返します。
成功したら@<code>{0}、失敗したら@<code>{1}を返します。

//list[amounit.veryl.sc.assign_slave][slaveにSC命令の結果を割り当てる (amounit.veryl)]{
#@maprange(scripts/13/sc-range/core/src/amounit.veryl,assign_slave)
    State::SCSuccess: {
        slave.ready  = master.rvalid;
        slave.rvalid = master.rvalid;
        slave.rdata  = 0;
    }
    State::SCFail: {
        slave.ready  = 1;
        slave.rvalid = 1;
        slave.rdata  = 1;
    }
#@end
//}

SC命令を受け入れるときに予約セットを確認し、アドレスが予約セットのアドレスと異なる場合は状態を@<code>{State::SCFail}に移動します
(@<list>{amounit.veryl.sc.accept_request_ff})。
成功、失敗に関係なく、予約セットを空にします。

//list[amounit.veryl.sc.accept_request_ff][accept_request_ff関数で予約セットを確認する (amounit.veryl)]{
#@maprange(scripts/13/sc-range/core/src/amounit.veryl,accept_request_ff)
    AMOOp::SC: {
        // reset reserved
        let prev            : logic = is_addr_reserved;
        is_addr_reserved = 0;
        // check
        if prev && slave.addr == reserved_addr {
            state = if master.ready ? State::SCSuccess : State::WaitReady;
        } else {
            state = State::SCFail;
        }
    }
#@end
//}

SC命令でメモリの@<code>{ready}が@<code>{1}になるのを待っているとき、
@<code>{ready}が@<code>{1}になったら状態を@<code>{State::SCSuccess}に移動します
(@<list>{amounit.veryl.sc.on_clock})。
また、命令の実行が終了したときに新しく要求を受け入れるようにします。

//list[amounit.veryl.sc.on_clock][SC命令の状態遷移 (amounit.veryl)]{
#@maprange(scripts/13/sc-range/core/src/amounit.veryl,on_clock)
    function on_clock () {
        case state {
            State::Init     : accept_request_ff();
            State::WaitReady: if master.ready {
                @<b>|if slave_saved.is_amo && slave_saved.amoop == AMOOp::SC {|
                @<b>|    state = State::SCSuccess;|
                @<b>|} else {|
                    state = State::WaitValid;
                @<b>|}|
            }
            State::WaitValid: if master.rvalid {
                accept_request_ff();
            }
            @<b>|State::SCSuccess: if master.rvalid {|
            @<b>|    accept_request_ff();|
            @<b>|}|
            @<b>|State::SCFail: accept_request_ff();|
            default      : {}
        }
    }
#@end
//}

SC命令によるメモリへの書き込みを実装します
(
@<list>{amounit.veryl.sc.accept_request_comb}、
@<list>{amounit.veryl.sc.master_comb}
)。

//list[amounit.veryl.sc.accept_request_comb][accept_request_comb関数で、予約セットをチェックしてからストアを要求する (amounit.veryl)]{
#@maprange(scripts/13/sc-range/core/src/amounit.veryl,accept_request_comb)
    case slave.amoop {
        AMOOp::LR: assign_master(slave.addr, 0, 0, 0);
        @<b>|AMOOp::SC: if is_addr_reserved && slave.addr == reserved_addr {|
        @<b>     assign_master(slave.addr, 1, slave.wdata, slave.wmask);|
        @<b> }|
        default: {}
    }
#@end
//}

//list[amounit.veryl.sc.master_comb][masterに値を割り当てる (amounit.veryl)]{
#@maprange(scripts/13/sc-range/core/src/amounit.veryl,master_comb)
    always_comb {
        reset_master();
        case state {
            State::Init     : accept_request_comb();
            State::WaitReady: if slave_saved.is_amo {
                case slave_saved.amoop {
                    AMOOp::LR: assign_master(slave_saved.addr, 0, 0, 0);
                    @<b>|AMOOp::SC: assign_master(slave_saved.addr, 1, slave_saved.wdata, slave_saved.wmask);|
                    default  : {}
                }
            } else {
                assign_master(slave_saved.addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
            }
            State::WaitValid               : accept_request_comb();
            @<b>|State::SCFail, State::SCSuccess: accept_request_comb();|
            default                        : {}
        }
    }
#@end
//}

== Zaamo拡張の実装

Zaamo拡張の命令はロード、演算、ストアを行います。
本章では、Zaamo拡張の命令を
@<code>{State::Init}
(、@<code>{State::AMOLoadReady})
、@<code>{State::AMOLoadValid}
(、@<code>{State::AMOStoreReady})
、@<code>{State::AMOStoreValid}
という状態遷移で処理するように実装します。

@<code>{State}型に新しい状態を定義してください
(@<list>{amounit.veryl.zaamo.State})。

//list[amounit.veryl.zaamo.State][Zaamo拡張の命令用の状態の定義 (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,State)
    enum State {
        Init,
        WaitReady,
        WaitValid,
        SCSuccess,
        SCFail,
        @<b>|AMOLoadReady,|
        @<b>|AMOLoadValid,|
        @<b>|AMOStoreReady,|
        @<b>|AMOStoreValid,|
    }
#@end
//}

簡単にZalrsc拡張と区別するために、
Zaamo拡張による要求かどうかを判定する関数(@<code>{is_Zaamo})をcore_data_ifインターフェースに作成します
(
@<list>{core_data_if.veryl.zaamo.is_Zaamo}、
@<list>{core_data_if.veryl.zaamo.master}
)。
modportにimport宣言を追加してください。

//list[core_data_if.veryl.zaamo.is_Zaamo][is_Zaamo関数の定義 (core_data_if.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/core_data_if.veryl,is_Zaamo)
    function is_Zaamo () -> logic {
        return is_amo && (amoop != AMOOp::LR && amoop != AMOOp::SC);
    }
#@end
//}

//list[core_data_if.veryl.zaamo.master][masterにis_Zaamo関数をimportする (core_data_if.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/core_data_if.veryl,master)
    amoop   : output,
    funct3  : output,
    @<b>|is_Zaamo: import,|
}
#@end
//}

ロードした値と@<code>{wdata}、フラグを利用して、ストアする値を生成する関数を作成します
(@<list>{amounit.veryl.zaamo.calc_amo})。
32ビット演算のとき、下位32ビットと上位32ビットのどちらを使うかをアドレスによって判別しています。

//list[amounit.veryl.zaamo.calc_amo][Zaamo拡張の命令の計算を行う関数の定義 (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,calc_amo)
    // AMO ALU
    function calc_amo::<W: u32> (
        amoop: input AMOOp   ,
        wdata: input logic<W>,
        rdata: input logic<W>,
    ) -> logic<W> {
        let lts: logic = $signed(wdata) <: $signed(rdata);
        let ltu: logic = wdata <: rdata;

        return case amoop {
            AMOOp::SWAP: wdata,
            AMOOp::ADD : rdata + wdata,
            AMOOp::XOR : rdata ^ wdata,
            AMOOp::AND : rdata & wdata,
            AMOOp::OR  : rdata | wdata,
            AMOOp::MIN : if lts ? wdata : rdata,
            AMOOp::MAX : if !lts ? wdata : rdata,
            AMOOp::MINU: if ltu ? wdata : rdata,
            AMOOp::MAXU: if !ltu ? wdata : rdata,
            default    : 0,
        };
    }

    // Zaamo拡張の命令のwdataを生成する
    function gen_amo_wdata (
        req  : modport core_data_if::all_input,
        rdata: input   UIntX                  ,
    ) -> UIntX {
        case req.funct3 {
            3'b010: { // word
                let low    : logic  = req.addr[2] == 0;
                let rdata32: UInt32 = if low ? rdata[31:0] : rdata[63:32];
                let wdata32: UInt32 = if low ? req.wdata[31:0] : req.wdata[63:32];
                let result : UInt32 = calc_amo::<32>(req.amoop, wdata32, rdata32);
                return if low ? {rdata[63:32], result} : {result, rdata[31:0]};
            }
            3'b011 : return calc_amo::<64>(req.amoop, req.wdata, rdata); // double
            default: return 0;
        }
    }
#@end
//}

ロードした値が命令の結果になるため、
値を保持するためのレジスタを作成します
(
@<list>{amounit.veryl.zaamo.reg}、
@<list>{amounit.veryl.zaamo.reset}
)。

//list[amounit.veryl.zaamo.reg][ロードしたデータを格納するレジスタの定義 (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,reg)
    // amo
    var zaamo_fetched_data: UIntX;
#@end
//}

//list[amounit.veryl.zaamo.reset][レジスタのリセット (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,reset)
        reserved_addr      = 0;
        @<b>|zaamo_fetched_data = 0;|
    }
#@end
//}

メモリアクセスが終了したら、ロードした値を返します
(@<list>{amounit.veryl.zaamo.assign_slave_comb})。

//list[amounit.veryl.zaamo.assign_slave_comb][命令の結果を返す (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,assign_slave_comb)
    State::AMOStoreValid: {
        slave.ready  = master.rvalid;
        slave.rvalid = master.rvalid;
        slave.rdata  = zaamo_fetched_data;
    }
#@end
//}

状態に基づいて、メモリへのロード、ストア要求を割り当てます
(
@<list>{amounit.veryl.zaamo.accept_request_comb}、
@<list>{amounit.veryl.zaamo.assign_master_comb}
)。

//list[amounit.veryl.zaamo.accept_request_comb][accept_request_comb関数で、まずロード要求を行う (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,accept_request_comb)
    default: @<b>|if slave.is_Zaamo()| {
        @<b>|assign_master(slave.addr, 0, 0, 0);|
    }
#@end
//}

//list[amounit.veryl.zaamo.assign_master_comb][状態に基づいてロード、ストア要求を行う (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,assign_master_comb)
    State::AMOLoadReady                      : assign_master      (slave_saved.addr, 0, 0, 0);
    State::AMOLoadValid, State::AMOStoreReady: {
        let rdata        : UIntX = if state == State::AMOLoadValid ? master.rdata : zaamo_fetched_data;
        let wdata        : UIntX = gen_amo_wdata(slave_saved, rdata);
        assign_master(slave_saved.addr, 1, wdata, slave_saved.wmask);
    }
    State::AMOStoreValid: accept_request_comb();
#@end
//}

TODO図に基づいて状態を遷移させます
(@<list>{amounit.veryl.zaamo.accept_request_ff})。

//list[amounit.veryl.zaamo.accept_request_ff][accept_request_ff関数で、masterのreadyによって次のstateを決める (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,accept_request_ff)
    default: @<b>|if slave.is_Zaamo()| {
        @<b>|state = if master.ready ? State::AMOLoadValid : State::AMOLoadReady;|
    }
#@end
//}

//list[amounit.veryl.zaamo.on_clock][Zaamo拡張の命令の状態の遷移 (amounit.veryl)]{
#@maprange(scripts/13/zaamo-range/core/src/amounit.veryl,on_clock)
    State::AMOLoadReady: if master.ready {
        state = State::AMOLoadValid;
    }
    State::AMOLoadValid: if master.rvalid {
        zaamo_fetched_data = master.rdata;
        state              = if slave.ready ? State::AMOStoreValid : State::AMOStoreReady;
    }
    State::AMOStoreReady: if master.ready {
        state = State::AMOStoreValid;
    }
    State::AMOStoreValid: if master.rvalid {
        accept_request_ff();
    }
#@end
//}

riscv-testsの@<code>{rv64ua-p-}から始まるテストを実行し、成功することを確認してください。