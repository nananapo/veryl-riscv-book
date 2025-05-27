= C拡張の実装

== 概要

これまでに実装した命令はすべて32ビット幅のものでした。
RISC-Vには32ビット幅以外の命令が定義されており、
それぞれ命令の下位ビットで何ビット幅の命令か判断できます(@<table>{riscv.instruction-length-encoding})。

//table[riscv.instruction-length-encoding][RISC-Vの命令長のエンコーディング]{
命令幅				エンコーディング
-------------------------------------------------------------
16-bit (aa≠11)		xxxaa
32-bit (bbb≠111)	bbb11
//}

C拡張は16ビット幅の命令を定義する拡張です。
よく使われる命令の幅を16ビットに圧縮できるようにすることでコードサイズを削減できます。
これ以降、C拡張によって導入される16ビット幅の命令のことをRVC命令と呼びます。

全てのRVC命令には同じ操作をする32ビット幅の命令が存在します@<fn>{zc-pseudo}。

//footnote[zc-pseudo][Zc*拡張の一部の命令は複数の命令になります]

RVC命令は表@<img>{rvc-instruction-formats}の9つのフォーマットが定義されています。

//image[rvc-instruction-formats][RVC命令のフォーマット][width=100%]

@<code>{rs1'}、@<code>{rs2'}、@<code>{rd'}は3ビットのフィールドで、
よく使われる8番(x8)から15番(x15)のレジスタを指定します。
即値の並び方やそれぞれの命令の具体的なフォーマットについては、
仕様書か@<secref>{impl-converter-all}のコードを参照してください。

TODO 書き換える
RV32IのCPUに実装されるC拡張には表@<img>{rvc-instruction-formats}のRVC命令が定義されています。
RV64IのCPUに実装されるC拡張には表@<img>{rvc-instruction-formats}に加えて表@<table>{impl-c.instructions}のRVC命令が定義されています。
一部のRV32IのRVC命令はRV64Iで別の命令に置き換わっていることに注意してください。

//table[impl-c.instructions][C拡張の命令]{
命令		32ビット幅での命令	形式
-------------------------------------------------------------
C.LWSP		lw rd, offset(x2)	CI
C.LDSP		ld rd, offset(x2)	CI
C.SWSP		sw rs2, offset(x2)	CSS
C.SDSP		sd rs2, offset(x2)	CSS
C.LW		lw rd, offset(rs)	CL
C.LD		ld rd, offset(rs)	CL
C.SW		sw rs2, offset(rs1)	CS
C.SD		sd rs2, offset(rs1)	CS
C.J			jal x0, offset		CJ
C.JAL		jal x1, offset		CJ
C.JR		jalr x0, 0(rs1)		CR
C.JALR		jalr x1, 0(rs1)		CR
C.BEQZ		beq rs1, x0, offset	CB
C.BNEZ		bne rs1, x0, offset	CB
C.LI		addi rd, x0, imm	CI
C.LUI		lui rd, imm			CI
C.ADDI		addi rd, rd, imm	CI
C.ADDIW		addiw rd, rd, imm	CI
C.ADDI16SP	addi x2, x2, imm	CI
C.ADDI4SPN	addi rd, x2, imm	CIW
C.SLLI		slli rd, rd, shamt	CI
C.SRLI		srli rd, rd, shamt	CB
C.SRAI		srai rd, rd, shamt	CB
C.ANDI		andi rd, rd, imm	CB
C.MV		add rd, x0, rs2		CR
C.ADD		add rd, rd, rs2		CR
C.AND		and rd, rd, rs2		CA
C.OR		or rd, rd, rs2		CA
C.XOR		xor rd, rd, rs2		CA
C.SUB		sub rd, rd, rs2		CA
C.EBREAK	ebreak				CR
//}

C拡張は浮動小数点命令をサポートするF、D拡張が実装されている場合に他の命令を定義しますが、
基本編ではF、D拡張を実装しないため実装、解説しません。

== IALIGNの変更

#@# TODO コード削減の図　できれば

@<secref>{11-impl-exception|def-ialign}で解説したように、
命令はIALIGNビットに整列したアドレスに配置されます。
C拡張はIALIGNによる制限を16ビットに緩め、全ての命令が16ビットに整列されたアドレスに配置されるように変更します。
これにより、RVC命令と32ビット幅の命令の組み合わせがあったとしても効果的にコードサイズを削減できます。

eeiパッケージに定数@<code>{IALIGN}を定義します
(@<list>{eei.veryl.ialign.IALIGN})。

//list[eei.veryl.ialign.IALIGN][IALIGNの定義 (eei.veryl)]{
#@maprange(scripts/14/ialign-range/core/src/eei.veryl,IALIGN)
    const IALIGN: u32 = 16;
#@end
//}

mepcレジスタの書き込みマスクを変更して、
トラップ時のジャンプ先アドレスに16ビットに整列されたアドレスを指定できるようにします
(@<list>{csrunit.veryl.ialign.mepc})。

//list[csrunit.veryl.ialign.mepc][MEPCの書き込みマスクを変更する (eei.veryl)]{
#@maprange(scripts/14/ialign-range/core/src/csrunit.veryl,mepc)
    const MEPC_WMASK  : UIntX = 'hffff_ffff_ffff_fff@<b>|e|;
#@end
//}

命令アドレスのミスアライン例外の判定を変更します。
IALIGNが@<code>{16}の場合は例外が発生しないようにします
(@<list>{core.veryl.ialign.exception})。
ジャンプ、分岐命令は2バイト単位のアドレスしか指定できないため、
C拡張が実装されている場合には例外が発生しません。

//list[core.veryl.ialign.exception][IALIGNが16のときに例外が発生しないようにする (core.veryl)]{
#@maprange(scripts/14/ialign-range/core/src/core.veryl,exception)
        let instruction_address_misaligned: logic = @<b>|IALIGN == 32 &&| memq_wdata.br_taken && memq_wdata.jump_addr[1:0] != 2'b00;
#@end
//}

== 実装方針

本章では次の順序でC拡張を実装します。

 1. 命令フェッチ処理(IFステージ)をcoreモジュールから分離する
 1. 16ビットに整列されたアドレスに配置された32ビット幅の命令を処理できるようにする
 1. RVC命令を32ビット幅の命令に変換するモジュールを作成する
 1. RVC命令を32ビット幅の命令に変換してcoreモジュールに供給する

最終的な命令フェッチ処理の構成は図@<img>{inst-fetch-structure}のようになります。

//image[inst-fetch-structure][命令フェッチ処理の構成][width=100%]

== 命令フェッチモジュールの実装

=== インターフェースを作成する

まず、命令フェッチを行うモジュールとcoreモジュールのインターフェースを定義します。

@<code>{src/core_inst_if.veryl}を作成し、次のように記述します
(@<list>{core_inst_if.veryl.if})。

//list[core_inst_if.veryl.if][core_inst_if.veryl]{
#@mapfile(scripts/14/if-range/core/src/core_inst_if.veryl)
import eei::*;

interface core_inst_if {
    var rvalid   : logic;
    var rready   : logic;
    var raddr    : Addr ;
    var rdata    : Inst ;
    var is_hazard: logic;
    var next_pc  : Addr ;

    modport master {
        rvalid   : input ,
        rready   : output,
        raddr    : input ,
        rdata    : input ,
        is_hazard: output, // control hazard
        next_pc  : output, // actual next pc
    }

    modport slave {
        ..converse(master)
    }
}
#@end
//}

@<code>{rvalid}、@<code>{rready}、@<code>{raddr}、@<code>{rdata}は、
coreモジュールのFIFO(@<code>{if_fifo})の@<code>{wvalid}、@<code>{wready}、@<code>{wdata.addr}、@<code>{wdata.bits}と同じ役割を果たします。
@<code>{is_hazard}、@<code>{next_pc}は制御ハザードの情報を伝えるための変数です。

=== coreモジュールのIFステージを削除する

coreモジュールのIFステージを削除し、
core_inst_ifインターフェースで代替します@<fn>{no-del}。

//footnote[no-del][ここで削除するコードは次の@<secref>{impl_fetcher}で実装するコードと似通っているため、削除せずにコメントアウトしておくと少し楽に実装できます。]

coreモジュールの@<code>{i_membus}の型を@<code>{core_inst_if}に変更します
(@<list>{core.veryl.if.port})。

//list[core.veryl.if.port][i_membusの型を変更する (core.veryl)]{
#@maprange(scripts/14/if-range/core/src/core.veryl,port)
    i_membus: modport @<b>|core_inst_if|::master,
#@end
//}

IFステージ部分のコードを次のように変更します
(@<list>{core.veryl.if.if})。

//list[core.veryl.if.if][IFステージの変更 (core.veryl)]{
#@maprange(scripts/14/if-range/core/src/core.veryl,if)
    ///////////////////////////////// IF Stage /////////////////////////////////

    var control_hazard        : logic;
    var control_hazard_pc_next: Addr ;

    always_comb {
        i_membus.is_hazard = control_hazard;
        i_membus.next_pc = control_hazard_pc_next;
    }
#@end
//}

coreモジュールの新しいIFステージ部分は、制御ハザードの情報をインターフェースに割り当てるだけの簡単なものになっています。
@<code>{if_fifo_type}型、@<code>{if_fifo_}から始まる変数は使わなくなったので削除してください。

IDステージとcore_inst_ifインターフェースを接続します
(@<list>{core.veryl.if.idvar}、
@<list>{core.veryl.if.idex})。
もともと@<code>{if_fifo}の@<code>{rvalid}、@<code>{rready}、@<code>{rdata}だった部分を@<code>{i_membus}に変更しています。

//list[core.veryl.if.idvar][IDステージとi_membusを接続する (core.veryl)]{
#@maprange(scripts/14/if-range/core/src/core.veryl,idvar)
    let ids_valid     : logic    = @<b>|i_membus.rvalid|;
    let ids_pc        : Addr     = @<b>|i_membus.raddr|;
    let ids_inst_bits : Inst     = @<b>|i_membus.rdata|;
#@end
//}

//list[core.veryl.if.idex][EXステージに進められるときにrreadyを1にする (core.veryl)]{
#@maprange(scripts/14/if-range/core/src/core.veryl,idex)
    always_comb {
        // ID -> EX
        @<b>|i_membus.|rready = exq_wready;
        exq_wvalid      = @<b>|i_membus.|rvalid;
        exq_wdata.addr  = @<b>|i_membus.|raddr;
        exq_wdata.bits  = @<b>|i_membus.|rdata;
        exq_wdata.ctrl  = ids_ctrl;
        exq_wdata.imm   = ids_imm;
#@end
//}

==={impl_fetcher} inst_fetcherモジュールを作成する

IFステージの代わりに命令フェッチをするinst_fetcherモジュールを作成します。
inst_fetcherモジュールでは命令フェッチ処理をfetch、issueの2段階で行います。

 : fetch
    メモリから64ビットの値を読み込み、issueとの間のFIFOに格納する。
    アドレスを@<code>{8}進めて、次の64ビットを読み込む。
 : issue
    fetchとの間のFIFOから64ビットを読み込み、
    32ビットずつcoreモジュールとの間のFIFOに格納する。

fetchとissueは並列に独立して動かします。

inst_fetcherモジュールのポートを定義します。
@<code>{src/inst_fetcher.veryl}を作成し、次のように記述します
(@<list>{inst_fetcher.veryl.if.port})。

//list[inst_fetcher.veryl.if.port][ポートの定義 (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,port)
module inst_fetcher (
    clk    : input   clock              ,
    rst    : input   reset              ,
    core_if: modport core_inst_if::slave,
    mem_if : modport Membus::master     ,
) {
#@end
//}

@<code>{core_if}はcoreモジュールとのインターフェース、
@<code>{mem_if}はメモリとのインターフェースです。

fetchとissue、issueとcore_ifの間のFIFOを作成します
(@<list>{inst_fetcher.veryl.if.fetch_fifo}、
@<list>{inst_fetcher.veryl.if.issue_fifo})。

//list[inst_fetcher.veryl.if.fetch_fifo][fetchとissueを繋ぐFIFOの作成 (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,fetch_fifo)
    struct fetch_fifo_type {
        addr: Addr                    ,
        bits: logic<MEMBUS_DATA_WIDTH>,
    }

    var fetch_fifo_flush : logic          ;
    var fetch_fifo_wvalid: logic          ;
    var fetch_fifo_wready: logic          ;
    var fetch_fifo_wdata : fetch_fifo_type;
    var fetch_fifo_rdata : fetch_fifo_type;
    var fetch_fifo_rready: logic          ;
    var fetch_fifo_rvalid: logic          ;

    inst fetch_fifo: fifo #(
        DATA_TYPE: fetch_fifo_type,
        WIDTH    : 3              ,
    ) (
        clk                          ,
        rst                          ,
        flush     : fetch_fifo_flush ,
        wready    : _                ,
        wready_two: fetch_fifo_wready,
        wvalid    : fetch_fifo_wvalid,
        wdata     : fetch_fifo_wdata ,
        rready    : fetch_fifo_rready,
        rvalid    : fetch_fifo_rvalid,
        rdata     : fetch_fifo_rdata ,
    );
#@end
//}

//list[inst_fetcher.veryl.if.issue_fifo][issueとcoreモジュールを繋ぐFIFOの作成 (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,issue_fifo)
    struct issue_fifo_type {
        addr: Addr,
        bits: Inst,
    }

    var issue_fifo_flush : logic          ;
    var issue_fifo_wvalid: logic          ;
    var issue_fifo_wready: logic          ;
    var issue_fifo_wdata : issue_fifo_type;
    var issue_fifo_rdata : issue_fifo_type;
    var issue_fifo_rready: logic          ;
    var issue_fifo_rvalid: logic          ;

    inst issue_fifo: fifo #(
        DATA_TYPE: issue_fifo_type,
        WIDTH    : 3              ,
    ) (
        clk                      ,
        rst                      ,
        flush : issue_fifo_flush ,
        wready: issue_fifo_wready,
        wvalid: issue_fifo_wvalid,
        wdata : issue_fifo_wdata ,
        rready: issue_fifo_rready,
        rvalid: issue_fifo_rvalid,
        rdata : issue_fifo_rdata ,
    );
#@end
//}

メモリへのアクセス処理(fetch)を実装します。
FIFOに空きがあるとき、64ビットの値を読み込んでPCを@<code>{8}進めます
(@<list>{inst_fetcher.veryl.if.fetch_var}、
@<list>{inst_fetcher.veryl.if.memory_assign}、
@<list>{inst_fetcher.veryl.if.fetch_pc})。
この処理はcoreモジュールの元のIFステージとほとんど同じです。

//list[inst_fetcher.veryl.if.fetch_var][PCと状態管理用の変数の定義 (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,fetch_var)
    var fetch_pc          : Addr ;
    var fetch_requested   : logic;
    var fetch_pc_requested: Addr ;
#@end
//}

//list[inst_fetcher.veryl.if.memory_assign][メモリへの要求の割り当て (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,memory_assign)
    always_comb {
        mem_if.valid = 0;
        mem_if.addr  = 0;
        mem_if.wen   = 0;
        mem_if.wdata = 0;
        mem_if.wmask = 0;
        if !core_if.is_hazard {
            mem_if.valid = fetch_fifo_wready;
            if fetch_requested {
                mem_if.valid = mem_if.valid && mem_if.rvalid;
            }
            mem_if.addr = fetch_pc;
        }
    }
#@end
//}

//list[inst_fetcher.veryl.if.fetch_pc][PC、状態の更新 (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,fetch_pc)
    always_ff {
        if_reset {
            fetch_pc           = INITIAL_PC;
            fetch_requested    = 0;
            fetch_pc_requested = 0;
        } else {
            if core_if.is_hazard {
                fetch_pc           = {core_if.next_pc[XLEN - 1:3], 3'b0};
                fetch_requested    = 0;
                fetch_pc_requested = 0;
            } else {
                if fetch_requested {
                    if mem_if.rvalid {
                        fetch_requested = mem_if.ready && mem_if.valid;
                        if mem_if.ready && mem_if.valid {
                            fetch_pc_requested =  fetch_pc;
                            fetch_pc           += 8;
                        }
                    }
                } else {
                    if mem_if.ready && mem_if.valid {
                        fetch_requested    =  1;
                        fetch_pc_requested =  fetch_pc;
                        fetch_pc           += 8;
                    }
                }
            }
        }
    }
#@end
//}

メモリから読み込んだ値をissueとの間のFIFOに格納します
(@<list>{inst_fetcher.veryl.if.memory_fetch})。

//list[inst_fetcher.veryl.if.memory_fetch][ロードした64ビットの値をFIFOに格納する (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,memory_fetch)
    // memory -> fetch_fifo
    always_comb {
        fetch_fifo_flush      = core_if.is_hazard;
        fetch_fifo_wvalid     = fetch_requested && mem_if.rvalid;
        fetch_fifo_wdata.addr = fetch_pc_requested;
        fetch_fifo_wdata.bits = mem_if.rdata;
    }
#@end
//}

coreモジュールに命令を供給する処理(issue)を実装します。
FIFOにデータが入っているとき、32ビットずつcoreモジュールとの間のFIFOに格納します。
2つの32ビットの命令をFIFOに格納出来たら、fetchとの間のFIFOを読み進めます
(@<list>{inst_fetcher.veryl.if.issue_offset}、
@<list>{inst_fetcher.veryl.if.fetch_issue})。

//list[inst_fetcher.veryl.if.issue_offset][オフセットの更新 (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,issue_offset)
    var issue_pc_offset: logic<3>;

    always_ff {
        if_reset {
            issue_pc_offset = 0;
        } else {
            if core_if.is_hazard {
                issue_pc_offset = core_if.next_pc[2:0];
            } else {
                if issue_fifo_wready && issue_fifo_wvalid {
                    issue_pc_offset += 4;
                }
            }
        }
    }
#@end
//}

//list[inst_fetcher.veryl.if.fetch_issue][issue_fifoに32ビットずつ命令を格納する (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,fetch_issue)
    // fetch_fifo <-> issue_fifo
    always_comb {
        let raddr : Addr                     = fetch_fifo_rdata.addr;
        let rdata : logic<MEMBUS_DATA_WIDTH> = fetch_fifo_rdata.bits;
        let offset: logic<3>                 = issue_pc_offset;

        fetch_fifo_rready = 0;
        issue_fifo_wvalid = 0;
        issue_fifo_wdata  = 0;

        if !core_if.is_hazard && fetch_fifo_rvalid {
            if issue_fifo_wready {
                fetch_fifo_rready     = offset == 4;
                issue_fifo_wvalid     = 1;
                issue_fifo_wdata.addr = {raddr[msb:3], offset};
                issue_fifo_wdata.bits = case offset {
                    0      : rdata[31:0],
                    4      : rdata[63:32],
                    default: 0,
                };
            }
        }
    }
#@end
//}

@<code>{core_if}とFIFOを接続します
(@<list>{inst_fetcher.veryl.if.issue_core})。

//list[inst_fetcher.veryl.if.issue_core][issue_fifoとインターフェースを接続する (inst_fetcher.veryl)]{
#@maprange(scripts/14/if-range/core/src/inst_fetcher.veryl,issue_core)
    // issue_fifo <-> core
    always_comb {
        issue_fifo_flush  = core_if.is_hazard;
        issue_fifo_rready = core_if.rready;
        core_if.rvalid    = issue_fifo_rvalid;
        core_if.raddr     = issue_fifo_rdata.addr;
        core_if.rdata     = issue_fifo_rdata.bits;
    }
#@end
//}

=== inst_fetcherモジュールとcoreモジュールを接続する

topモジュールで、core_inst_ifをインスタンス化します。
(@<list>{top.veryl.if.i_membus_core})。

//list[top.veryl.if.i_membus_core][インターフェースの定義 (top.veryl)]{
#@maprange(scripts/14/if-range/core/src/top.veryl,i_membus_core)
    inst i_membus_core: core_inst_if;
#@end
//}

inst_fetcherモジュールをインスタンス化し、coreモジュールと接続します
(
@<list>{top.veryl.if.inst}、
@<list>{top.veryl.if.core}
)。

//list[top.veryl.if.inst][inst_fetcherモジュールのインスタンス化 (top.veryl)]{
#@maprange(scripts/14/if-range/core/src/top.veryl,inst)
    inst fetcher: inst_fetcher (
        clk                   ,
        rst                   ,
        core_if: i_membus_core,
        mem_if : i_membus     ,
    );
#@end
//}

//list[top.veryl.if.core][インターフェースを変更する (top.veryl)]{
#@maprange(scripts/14/if-range/core/src/top.veryl,core)
    inst c: core (
        clk                    ,
        rst                    ,
        @<b>|i_membus: i_membus_core,|
        d_membus: d_membus_core,
        led                    ,
    );
#@end
//}

inst_fetcherモジュールが64ビットのデータを32ビットの命令の列に変換してくれるようになったので、
@<code>{d_membus}との調停のところで32ビットずつ選択する必要がなくなりました。
そのため、@<code>{rdata}をそのまま割り当てて、@<code>{memarb_last_iaddr}変数とビットの選択処理を削除します
(@<list>{top.veryl.if.memarb_last_i_def}、
@<list>{top.veryl.if.memarb_last_i_update}、
@<list>{top.veryl.if.memarb})。

//list[top.veryl.if.memarb_last_i_def][使用しない変数を削除する (top.veryl)]{
#@maprange(scripts/14/if-range/core/src/top.veryl,memarb_last_i_def)
    var memarb_last_i: logic;
    @<del>|var memarb_last_iaddr: Addr;|
#@end
//}

//list[top.veryl.if.memarb_last_i_update][使用しない変数を削除する (top.veryl)]{
#@maprange(scripts/14/if-range/core/src/top.veryl,memarb_last_i_update)
    always_ff {
        if_reset {
            memarb_last_i = 0;
            @<del>|memarb_last_i = 0;|
        } else {
            if mmio_membus.ready {
                memarb_last_i = !d_membus.valid;
                @<del>|memarb_last_iaddr = i_membus.addr;|
            }
        }
    }
#@end
//}

//list[top.veryl.if.memarb][ビットの選択処理を削除する (top.veryl)]{
#@maprange(scripts/14/if-range/core/src/top.veryl,memarb)
    always_comb {
        i_membus.ready  = mmio_membus.ready && !d_membus.valid;
        i_membus.rvalid = mmio_membus.rvalid && memarb_last_i;
        i_membus.rdata  = @<b>|mmio_membus.rdata|;
#@end
//}

== 16ビット境界に配置された32ビット幅の命令のサポート

inst_fetcherモジュールで、アドレスが2バイトの倍数の32ビット幅の命令をcoreモジュールに供給できるようにします。

アドレスの下位3ビット(@<code>{issue_pc_offset})が@<code>{6}の場合、
issueとcoreの間に供給する命令のビット列は@<code>{fetch_fifo_rdata}の上位16ビットと@<code>{fetch_fifo}に格納されている次のデータの下位16ビットを結合したものになります。
このとき、@<code>{fetch_fifo_rdata}のデータの下位16ビットとアドレスを保存して、次のデータを読み出します。
@<code>{fetch_fifo}から次のデータを読み出せたら、保存していたデータと結合し、アドレスとともに@<code>{issue_fifo}に書き込みます。
@<code>{issue_pc_offset}が@<code>{0}、@<code>{2}、@<code>{4}の場合、既存の処理との変更点はありません。

@<code>{fetch_fifo_rdata}のデータの下位16ビットとアドレスを保持する変数を作成します
(@<list>{inst_fetcher.veryl.232.var})。

//list[inst_fetcher.veryl.232.var][データを一時保存するための変数の定義 (inst_fetcher.veryl)]{
#@maprange(scripts/14/232-range/core/src/inst_fetcher.veryl,var)
    var issue_is_rdata_saved: logic    ;
    var issue_saved_addr    : Addr     ;
    var issue_saved_bits    : logic<16>; // rdata[63:48]
#@end
//}

@<code>{issue_pc_offset}が@<code>{6}のとき、変数にデータを保存します
(@<list>{inst_fetcher.veryl.232.issue_ff})。

//list[inst_fetcher.veryl.232.issue_ff][offsetが6のとき、変数に命令の下位16ビットとアドレスを保存する (inst_fetcher.veryl)]{
#@maprange(scripts/14/232-range/core/src/inst_fetcher.veryl,issue_ff)
    always_ff {
        if_reset {
            issue_pc_offset      = 0;
            @<b>|issue_is_rdata_saved = 0;|
            @<b>|issue_saved_addr     = 0;|
            @<b>|issue_saved_bits     = 0;|
        } else {
            if core_if.is_hazard {
                issue_pc_offset      = core_if.next_pc[2:0];
                @<b>|issue_is_rdata_saved = 0;|
            } else {
                @<b>|// offsetが6な32ビット命令の場合、|
                @<b>|// アドレスと上位16ビットを保存してFIFOを読み進める|
                @<b>|if issue_pc_offset == 6 && !issue_is_rdata_saved {|
                @<b>|    if fetch_fifo_rvalid {|
                @<b>|        issue_is_rdata_saved = 1;|
                @<b>|        issue_saved_addr     = fetch_fifo_rdata.addr;|
                @<b>|        issue_saved_bits     = fetch_fifo_rdata.bits[63:48];|
                @<b>|    }|
                @<b>|} else {|
                    if issue_fifo_wready && issue_fifo_wvalid {
                        issue_pc_offset      += 4;
                        @<b>|issue_is_rdata_saved =  0;|
                    }
                @<b>|}|
            }
        }
    }
#@end
//}

@<code>{issue_pc_offset}が@<code>{2}、@<code>{6}の場合の@<code>{issue_fifo}への書き込みを実装します
(@<list>{inst_fetcher.veryl.232.issue_comb})。
@<code>{6}の場合、保存していた16ビットと新しく読み出した16ビットを結合した値、保存していたアドレスを書き込みます。

//list[inst_fetcher.veryl.232.issue_comb][issue_fifoにoffsetが2、6の命令を格納する (inst_fetcher.veryl)]{
#@maprange(scripts/14/232-range/core/src/inst_fetcher.veryl,issue_comb)
        if !core_if.is_hazard && fetch_fifo_rvalid {
            if issue_fifo_wready {
                @<b>|if offset == 6 {|
                @<b>|    // offsetが6な32ビット命令の場合、|
                @<b>|    // 命令は{rdata_next[15:0], rdata[63:48}になる|
                @<b>|    if issue_is_rdata_saved {|
                @<b>|        issue_fifo_wvalid     = 1;|
                @<b>|        issue_fifo_wdata.addr = {issue_saved_addr[msb:3], offset};|
                @<b>|        issue_fifo_wdata.bits = {rdata[15:0], issue_saved_bits};|
                @<b>|    } else {|
                @<b>|        // Read next 8 bytes|
                @<b>|        fetch_fifo_rready = 1;|
                @<b>|    }|
                @<b>|} else {|
                    fetch_fifo_rready     = offset == 4;
                    issue_fifo_wvalid     = 1;
                    issue_fifo_wdata.addr = {raddr[msb:3], offset};
                    issue_fifo_wdata.bits = case offset {
                        0      : rdata[31:0],
                        @<b>|2      : rdata[47:16],|
                        4      : rdata[63:32],
                        default: 0,
                    };
                @<b>|}|
            }
        }
#@end
//}

32ビット幅の命令の下位16ビットが既に保存されている(@<code>{issue_is_rdata_saved}が@<code>{1})とき、
@<code>{fetch_fifo}から供給されるデータには、
32ビット幅の命令の上位16ビットを除いた残りの48ビットが含まれているので
@<code>{fetch_fifo_rready}を@<code>{1}に設定しないことに注意してください。

== RVC命令の変換

=== RVC命令フラグの実装

RVC命令を32ビット幅の命令に変換するモジュールを作る前に、
RVC命令かどうかを示すフラグを作成します。

まず、@<code>{core_inst_if}インターフェースと@<code>{InstCtrl}構造体に@<code>{is_rvc}フラグを追加します
(@<list>{core_inst_if.veryl.is_rvc.var}、
@<list>{core_inst_if.veryl.is_rvc.master}、
@<list>{corectrl.veryl.is_rvc.InstCtrl})。

//list[core_inst_if.veryl.is_rvc.var][is_rvcフラグの定義 (core_inst_if.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/core_inst_if.veryl,var)
    var rdata    : Inst ;
    @<b>|var is_rvc   : logic;|
    var is_hazard: logic;
#@end
//}

//list[core_inst_if.veryl.is_rvc.master][modportにis_rvcを追加する (core_inst_if.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/core_inst_if.veryl,master)
    modport master {
        rvalid   : input ,
        rready   : output,
        raddr    : input ,
        rdata    : input ,
        @<b>|is_rvc   : input ,|
        is_hazard: output, // control hazard
        next_pc  : output, // actual next pc
    }
#@end
//}

//list[corectrl.veryl.is_rvc.InstCtrl][InstCtrl型にis_rvcフラグを追加する (corectrl.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/corectrl.veryl,InstCtrl)
        is_amo   : logic      , // AMO instruction
        @<b>|is_rvc   : logic      , // RVC instruction|
        funct3   : logic   <3>, // 命令のfunct3フィールド
#@end
//}

inst_fetcherモジュールで、@<code>{is_rvc}を@<code>{0}に設定してcoreモジュールに供給します
(@<list>{inst_fetcher.veryl.is_rvc.issue_fifo_type}、
@<list>{inst_fetcher.veryl.is_rvc.issue_comb}、
@<list>{inst_fetcher.veryl.is_rvc.issue_core})。

//list[inst_fetcher.veryl.is_rvc.issue_fifo_type][issue_fifo_type型にis_rvcフラグを追加する (inst_fetcher.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/inst_fetcher.veryl,issue_fifo_type)
    struct issue_fifo_type {
        addr  : Addr ,
        bits  : Inst ,
        @<b>|is_rvc: logic,|
    }
#@end
//}

//list[inst_fetcher.veryl.is_rvc.issue_comb][is_rvcフラグを0に設定する (inst_fetcher.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/inst_fetcher.veryl,issue_comb)
    if offset == 6 {
        // offsetが6な32ビット命令の場合、
        // 命令は{rdata_next[15:0], rdata[63:48}になる
        if issue_is_rdata_saved {
            issue_fifo_wvalid       = 1;
            issue_fifo_wdata.addr   = {issue_saved_addr[msb:3], offset};
            issue_fifo_wdata.bits   = {rdata[15:0], issue_saved_bits};
            @<b>|issue_fifo_wdata.is_rvc = 0;|
        } else {
            // Read next 8 bytes
            fetch_fifo_rready = 1;
        }
    } else {
        fetch_fifo_rready     = offset == 4;
        issue_fifo_wvalid     = 1;
        issue_fifo_wdata.addr = {raddr[msb:3], offset};
        issue_fifo_wdata.bits = case offset {
            0      : rdata[31:0],
            2      : rdata[47:16],
            4      : rdata[63:32],
            default: 0,
        };
        @<b>|issue_fifo_wdata.is_rvc = 0;|
    }
#@end
//}

//list[inst_fetcher.veryl.is_rvc.issue_core][is_rvcフラグを接続する (inst_fetcher.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/inst_fetcher.veryl,issue_core)
    always_comb {
        issue_fifo_flush  = core_if.is_hazard;
        issue_fifo_rready = core_if.rready;
        core_if.rvalid    = issue_fifo_rvalid;
        core_if.raddr     = issue_fifo_rdata.addr;
        core_if.rdata     = issue_fifo_rdata.bits;
        @<b>|core_if.is_rvc    = issue_fifo_rdata.is_rvc;|
    }
#@end
//}

inst_decoderモジュールで、@<code>{InstCtrl}構造体の@<code>{is_rvc}フラグを設定します
(@<list>{inst_decoder.veryl.is_rvc.port}、
@<list>{inst_decoder.veryl.is_rvc.ctrl}、
@<list>{inst_decoder.veryl.is_rvc.valid})。
また、C拡張が無効なのにRVC命令が供給されたら@<code>{valid}フラグを@<code>{0}に設定します。

//list[inst_decoder.veryl.is_rvc.port][is_rvcフラグをポートに追加する (inst_decoder.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/inst_decoder.veryl,port)
module inst_decoder (
    bits  : input  Inst    ,
    @<b>|is_rvc: input  logic   ,|
    valid : output logic   ,
    ctrl  : output InstCtrl,
    imm   : output UIntX   ,
) {
#@end
//}

//list[inst_decoder.veryl.is_rvc.ctrl][InstCtrlにis_rvcフラグを設定する (inst_decoder.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/inst_decoder.veryl,ctrl)
                default: {
                    InstType::X, F, F, F, F, F, F, F, F, F
                },
            }, @<b>|is_rvc,| f3, f7
        };
#@end
//}

//list[inst_decoder.veryl.is_rvc.valid][IALIGNが32ではないとき、不正な命令にする (inst_decoder.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/inst_decoder.veryl,valid)
            OP_AMO     : f3 == 3'b010 || f3 == 3'b011, // AMO
            default    : F,
        } @<b>{&& (IALIGN == 16 || !is_rvc)}; @<b>{// IALIGN == 32のとき、C拡張は無効}
#@end
//}

coreモジュールで、inst_decoderモジュールに@<code>{is_rvc}フラグを渡します
(@<list>{core.veryl.is_rvc.inst_decoder})。

//list[core.veryl.is_rvc.inst_decoder][is_rvcフラグをinst_decoderに渡す (core.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/core.veryl,inst_decoder)
    inst decoder: inst_decoder (
        bits  : ids_inst_bits  ,
        @<b>|is_rvc: i_membus.is_rvc,|
        valid : ids_inst_valid ,
        ctrl  : ids_ctrl       ,
        imm   : ids_imm        ,
    );
#@end
//}

ジャンプ命令でライトバックする値は次の命令のアドレスであるため、
RVC命令の場合はPCに@<code>{2}を足した値を設定します
(@<list>{core.veryl.is_rvc.wb_data})。

//list[core.veryl.is_rvc.wb_data][次の命令のアドレスを変える (core.veryl)]{
#@maprange(scripts/14/is_rvc-range/core/src/core.veryl,wb_data)
    let wbs_wb_data: UIntX    = if wbs_ctrl.is_lui ?
        wbs_imm
    : if wbs_ctrl.is_jump ?
        wbs_pc + @<b>|(if wbs_ctrl.is_rvc ? 2 : |4@<b>|)|
    : if wbs_ctrl.is_load || wbs_ctrl.is_amo ?
#@end
//}

==={impl-converter-all} 32ビット幅の命令に変換する

RVC命令のopcode、functなどのフィールドを読んで、
32ビット幅の命令を生成するrvc_converterモジュールを実装します。

その前に、命令のフィールドを引数に32ビット幅の命令を生成する関数を実装します。
@<code>{src/inst_gen_pkg.veryl}を作成し、次のように記述します
(@<list>{inst_gen_pkg.veryl.rvcc})。
関数の名前は基本的に命令名と同じにしていますが、
Verylのキーワードと被るものは@<code>{inst_}をprefixにしています。

#@# TODO フォーマット
//list[inst_gen_pkg.veryl.rvcc][命令のビット列を生成する関数を定義する (inst_gen_pkg.veryl)]{
import eei::*;

package inst_gen_pkg {
    function add (rd: input logic<5>, rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0000000, rs2, rs1, 3'b000, rd, OP_OP};
    }

    function addw (rd: input logic<5>, rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0000000, rs2, rs1, 3'b000, rd, OP_OP_32};
    }

    function addi (rd : input logic<5> , rs1: input logic<5> , imm: input logic<12>) -> Inst {
        return {imm, rs1, 3'b000, rd, OP_OP_IMM};
    }

    function addiw (rd: input logic<5> ,rs1: input logic<5>, imm: input logic<12>) -> Inst {
        return {imm, rs1, 3'b000, rd, OP_OP_IMM_32};
    }

    function sub (rd: input logic<5>,rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0100000, rs2, rs1, 3'b000, rd, OP_OP};
    }

    function subw (rd: input logic<5>, rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0100000, rs2, rs1, 3'b000, rd, OP_OP_32};
    }

    function inst_xor (rd: input logic<5>, rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0000000, rs2, rs1, 3'b100, rd, OP_OP};
    }

    function inst_or (rd: input logic<5>, rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0000000, rs2, rs1, 3'b110, rd, OP_OP};
    }

    function inst_and (rd: input logic<5>, rs1: input logic<5>, rs2: input logic<5>) -> Inst {
        return {7'b0000000, rs2, rs1, 3'b111, rd, OP_OP};
    }

    function andi (rd: input logic<5> , rs1: input logic<5>, imm: input logic<12>) -> Inst {
        return {imm, rs1, 3'b111, rd, OP_OP_IMM};
    }

    function slli (rd: input logic<5>, rs1: input logic<5>, shamt: input logic<6>) -> Inst {
        return {6'b000000, shamt, rs1, 3'b001, rd, OP_OP_IMM};
    }

    function srli (rd: input logic<5>, rs1: input logic<5>, shamt: input logic<6>) -> Inst {
        return {6'b000000, shamt, rs1, 3'b101, rd, OP_OP_IMM};
    }

    function srai (rd: input logic<5>, rs1: input logic<5>, shamt: input logic<6>) -> Inst {
        return {6'b010000, shamt, rs1, 3'b101, rd, OP_OP_IMM};
    }

    function lui (rd: input logic<5>, imm: input logic<20>) -> Inst {
        return {imm, rd, OP_LUI};
    }

    function load (rd: input logic<5> ,rs1: input logic<5>, imm: input logic<12>, funct3: input logic<3>) -> Inst {
        return {imm, rs1, funct3, rd, OP_LOAD};
    }

    function store (rs1: input logic<5>, rs2: input logic<5>, imm: input logic<12>, funct3: input logic<3>) -> Inst {
        return {imm[11:5], rs2, rs1, funct3, imm[4:0], OP_STORE};
    }

    function jal (rd : input logic<5>, imm: input logic<20>) -> Inst {
        return {imm[19], imm[9:0], imm[10], imm[18:11], rd, OP_JAL};
    }

    function jalr (rd: input logic<5>, rs1: input logic<5>, imm: input logic<12>) -> Inst {
        return {imm, rs1, 3'b000, rd, OP_JALR};
    }

    function beq (rs1: input logic<5>, rs2: input logic<5>, imm: input logic<12>) -> Inst {
        return {imm[11], imm[9:4], rs2, rs1, 3'b000, imm[3:0], imm[10], OP_BRANCH};
    }

    function bne (rs1: input logic<5>, rs2: input logic<5>, imm: input logic<12>) -> Inst {
        return {imm[11], imm[9:4], rs2, rs1, 3'b001, imm[3:0], imm[10], OP_BRANCH};
    }

    function ebreak () -> Inst {
        return 32'h00100073;
    }
}
//}

rvc_conveterモジュールのポートを定義します。
@<code>{src/rvc_converter.veryl}を作成し、次のように記述します
(@<list>{rvc_converter.veryl.rvcc.port})。

//list[rvc_converter.veryl.rvcc.port][ポートの定義 (rvc_converter.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/rvc_converter.veryl,port)
import eei::*;
import inst_gen_pkg::*;

module rvc_converter (
    inst16: input  logic<16>,
    is_rvc: output logic    ,
    inst32: output Inst     ,
) {
#@end
//}

rvc_converterモジュールは、@<code>{inst16}で16ビットの値を受け取り、
それがRVC命令なら@<code>{is_rvc}を@<code>{1}にして、
@<code>{inst32}に同じ意味の32ビット幅の命令を出力する組み合わせ回路です。

@<code>{inst16}からソースレジスタ番号を生成します
(@<list>{rvc_converter.veryl.rvcc.rs})。
@<code>{rs1d}、@<code>{rs2d}の番号の範囲は@<code>{x8}から@<code>{x15}です。

//list[rvc_converter.veryl.rvcc.rs][レジスタ番号の生成 (rvc_converter.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/rvc_converter.veryl,rs)
    let rs1 : logic<5> = inst16[11:7];
    let rs2 : logic<5> = inst16[6:2];
    let rs1d: logic<5> = {2'b01, inst16[9:7]};
    let rs2d: logic<5> = {2'b01, inst16[4:2]};
#@end
//}

@<code>{inst16}から即値を生成します
(@<list>{rvc_converter.veryl.rvcc.imm})。

//list[rvc_converter.veryl.rvcc.imm][即値の生成 (rvc_converter.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/rvc_converter.veryl,imm)
    let imm_i    : logic<12> = {inst16[12] repeat 7, inst16[6:2]};
    let imm_shamt: logic<6>  = {inst16[12], inst16[6:2]};
    let imm_j    : logic<20> = {inst16[12] repeat 10, inst16[8], inst16[10:9], inst16[6], inst16[7], inst16[2], inst16[11], inst16[5:3]};
    let imm_br   : logic<12> = {inst16[12] repeat 5, inst16[6:5], inst16[2], inst16[11:10], inst16[4:3]};
    let c0_mem_w : logic<12> = {5'b0, inst16[5], inst16[12:10], inst16[6], 2'b0}; // C.LW, C.SW
    let c0_mem_d : logic<12> = {4'b0, inst16[6:5], inst16[12:10], 3'b0}; // C.LD, C.SD
#@end
//}

@<code>{inst16}から32ビット幅の命令を生成します
(@<list>{rvc_converter.veryl.rvcc.always_comb})。
opcode(@<code>{inst16[1:0]})が@<code>{2'b11}以外なら16ビット幅の命令なので、
@<code>{is_rvc}に@<code>{1}を割り当てます。
@<code>{inst32}には、初期値として右に@<code>{inst16}を詰めてゼロで拡張した値を割り当てます。

32ビット幅の命令への変換はopcode、funct、レジスタ番号などで分岐して地道に実装します。
32ビット幅の命令に変換できないとき@<code>{inst32}の値を更新しません。

@<code>{inst16}が不正なRVC命令のとき、
inst_decoderモジュールでデコードできない命令をcoreモジュールに供給してIllegal instruction例外を発生させ、
tvalに16ビット幅の不正な命令が設定されます。

//list[rvc_converter.veryl.rvcc.always_comb][RVC命令を32ビット幅の命令に変換する (rvc_converter.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/rvc_converter.veryl,always_comb)
    always_comb {
        is_rvc = inst16[1:0] != 2'b11;
        inst32 = {16'b0, inst16};

        let funct3: logic<3> = inst16[15:13];
        case inst16[1:0] { // opcode
            2'b00: case funct3 { // C0
                3'b000: if inst16 != 0 { // C.ADDI4SPN
                    let nzuimm: logic<10> = {inst16[10:7], inst16[12:11], inst16[5], inst16[6], 2'b0};
                    inst32 = addi(rs2d, 2, {2'b0, nzuimm});
                }
                3'b010: inst32 = load(rs2d, rs1d, c0_mem_w, 3'b010); // C.LW
                3'b011: if XLEN >= 64 { // C.LD
                    inst32 = load(rs2d, rs1d, c0_mem_d, 3'b011);
                }
                3'b110: inst32 = store(rs1d, rs2d, c0_mem_w, 3'b010); // C.SW
                3'b111: if XLEN >= 64 { // C.SD
                    inst32 = store(rs1d, rs2d, c0_mem_d, 3'b011);
                }
                default: {}
            }
            2'b01: case funct3 { // C1
                3'b000: inst32 = addi(rs1, rs1, imm_i); // C.ADDI
                3'b001: inst32 = if XLEN == 32 ? jal(1, imm_j) : addiw(rs1, rs1, imm_i); // C.JAL / C.ADDIW
                3'b010: inst32 = addi(rs1, 0, imm_i); // C.LI
                3'b011: if rs1 == 2 { // C.ADDI16SP
                    let imm   : logic<10> = {inst16[12], inst16[4:3], inst16[5], inst16[2], inst16[6], 4'b0};
                    inst32 = addi(2, 2, {imm[msb] repeat 2, imm});
                } else { // C.LUI
                    inst32 = lui(rs1, {imm_i[msb] repeat 8, imm_i});
                }
                3'b100: case inst16[11:10] { // funct2 or funct6[1:0]
                    2'b00: if !(XLEN == 32 && imm_shamt[msb] == 1) {
                        inst32 = srli(rs1d, rs1d, imm_shamt); // C.SRLI
                    }
                    2'b01: if !(XLEN == 32 && imm_shamt[msb] == 1) {
                        inst32 = srai(rs1d, rs1d, imm_shamt); // C.SRAI
                    }
                    2'b10: inst32 = andi(rs1d, rs1d, imm_i); // C.ADNI
                    2'b11: if inst16[12] == 0 {
                        case inst16[6:5] {
                            2'b00  : inst32 = sub(rs1d, rs1d, rs2d); // C.SUB
                            2'b01  : inst32 = inst_xor(rs1d, rs1d, rs2d); // C.XOR
                            2'b10  : inst32 = inst_or(rs1d, rs1d, rs2d); // C.OR
                            2'b11  : inst32 = inst_and(rs1d, rs1d, rs2d); // C.AND
                            default: {}
                        }
                    } else {
                        if XLEN >= 64 {
                            if inst16[6:5] == 2'b00 {
                                inst32 = subw(rs1d, rs1d, rs2d); // C.SUBW
                            } else if inst16[6:5] == 2'b01 {
                                inst32 = addw(rs1d, rs1d, rs2d); // C.ADDW
                            }
                        }
                    }
                    default: {}
                }
                3'b101 : inst32 = jal(0, imm_j); // C.J
                3'b110 : inst32 = beq(rs1d, 0, imm_br); // C.BEQZ
                3'b111 : inst32 = bne(rs1d, 0, imm_br); // C.BNEZ
                default: {}
            }
            2'b10: case funct3 { // C2
                3'b000: if !(XLEN == 32 && imm_shamt[msb] == 1) {
                    inst32 = slli(rs1, rs1, imm_shamt); // C.SLLI
                }
                3'b010: if rs1 != 0 { // C.LWSP
                    let offset: logic<8> = {inst16[3:2], inst16[12], inst16[6:4], 2'b0};
                    inst32 = load(rs1, 2, {4'b0, offset}, 3'b010);
                }
                3'b011: if XLEN >= 64 && rs1 != 0 { // C.LDSP
                    let offset: logic<9> = {inst16[4:2], inst16[12], inst16[6:5], 3'b0};
                    inst32 = load(rs1, 2, {3'b0, offset}, 3'b011);
                }
                3'b100: if inst16[12] == 0 {
                    inst32 = if rs2 == 0 ? jalr(0, rs1, 0) : addi(rs1, rs2, 0); // C.JR / C.MV
                } else {
                    if rs2 == 0 {
                        inst32 = if rs1 == 0 ? ebreak() : jalr(1, rs1, 0); // C.EBREAK : C.JALR
                    } else {
                        inst32 = add(rs1, rs1, rs2); // C.ADD
                    }
                }
                3'b110: { // C.SWSP
                    let offset: logic<8> = {inst16[8:7], inst16[12:9], 2'b0};
                    inst32 = store(2, rs2, {4'b0, offset}, 3'b010);
                }
                3'b111: if XLEN >= 64 { // C.SDSP
                    let offset: logic<9> = {inst16[9:7], inst16[12:10], 3'b0};
                    inst32 = store(2, rs2, {3'b0, offset}, 3'b011);
                }
                default: {}
            }
            default: {}
        }
    }
#@end
//}

=== RVC命令を発行する

inst_fetcherモジュールでrvc_converterモジュールをインスタンス化し、
RVC命令をcoreモジュールに供給します。

まず、rvc_converterモジュールをインスタンス化します
(@<list>{inst_fetcher.veryl.rvcc.inst})。

//list[inst_fetcher.veryl.rvcc.inst][rvc_converterモジュールのインスタンス化 (inst_fetcher.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/inst_fetcher.veryl,inst)
    // instruction converter
    var rvcc_inst16: logic<16>;
    var rvcc_is_rvc: logic    ;
    var rvcc_inst32: Inst     ;

    inst rvcc: rvc_converter (
        inst16: case issue_pc_offset {
            0      : fetch_fifo_rdata.bits[15:0],
            2      : fetch_fifo_rdata.bits[31:16],
            4      : fetch_fifo_rdata.bits[47:32],
            6      : fetch_fifo_rdata.bits[63:48],
            default: 0,
        },
        is_rvc: rvcc_is_rvc,
        inst32: rvcc_inst32,
    );
#@end
//}

RVC命令のとき、変換された32ビット幅の命令を@<code>{issue_fifo}に書き込み、
@<code>{issue_pc_offset}を@<code>{4}ではなく@<code>{2}増やすようにします
(@<list>{inst_fetcher.veryl.rvcc.issue_ff}、
@<list>{inst_fetcher.veryl.rvcc.issue_comb})。

//list[inst_fetcher.veryl.rvcc.issue_ff][RVC命令のときのオフセットの更新 (inst_fetcher.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/inst_fetcher.veryl,issue_ff)
// offsetが6な32ビット命令の場合、
// アドレスと上位16ビットを保存してFIFOを読み進める
if issue_pc_offset == 6 && @<b>|!rvcc_is_rvc &&| !issue_is_rdata_saved {
    if fetch_fifo_rvalid {
        issue_is_rdata_saved = 1;
        issue_saved_addr     = fetch_fifo_rdata.addr;
        issue_saved_bits     = fetch_fifo_rdata.bits[63:48];
    }
} else {
    if issue_fifo_wready && issue_fifo_wvalid {
        issue_pc_offset      += @<b>{if issue_is_rdata_saved || !rvcc_is_rvc ?} 4 @<b>{: 2};
        issue_is_rdata_saved =  0;
    }
}
#@end
//}

//list[inst_fetcher.veryl.rvcc.issue_comb][RVC命令のときのissue_fifoへの書き込み (inst_fetcher.veryl)]{
#@maprange(scripts/14/rvcc-range/core/src/inst_fetcher.veryl,issue_comb)
if !core_if.is_hazard && fetch_fifo_rvalid {
    if issue_fifo_wready {
        if offset == 6 {
            // offsetが6な32ビット命令の場合、
            // 命令は{rdata_next[15:0], rdata[63:48}になる
            if issue_is_rdata_saved {
                issue_fifo_wvalid       = 1;
                issue_fifo_wdata.addr   = {issue_saved_addr[msb:3], offset};
                issue_fifo_wdata.bits   = {rdata[15:0], issue_saved_bits};
                issue_fifo_wdata.is_rvc = 0;
            } else {
                fetch_fifo_rready = 1;
                @<b>|if rvcc_is_rvc {|
                @<b>|    issue_fifo_wvalid       = 1;|
                @<b>|    issue_fifo_wdata.addr   = {raddr[msb:3], offset};|
                @<b>|    issue_fifo_wdata.is_rvc = 1;|
                @<b>|    issue_fifo_wdata.bits   = rvcc_inst32;|
                @<b>|} else {|
                    // Read next 8 bytes
                @<b>|}|
            }
        } else {
            fetch_fifo_rready     = @<b>|!rvcc_is_rvc &&| offset == 4;
            issue_fifo_wvalid     = 1;
            issue_fifo_wdata.addr = {raddr[msb:3], offset};
            @<b>|if rvcc_is_rvc {|
            @<b>|    issue_fifo_wdata.bits = rvcc_inst32;|
            @<b>|} else {|
                issue_fifo_wdata.bits = case offset {
                    0      : rdata[31:0],
                    2      : rdata[47:16],
                    4      : rdata[63:32],
                    default: 0,
                };
            @<b>|}|
            issue_fifo_wdata.is_rvc = @<b>|rvcc_is_rvc|;
        }
    }
}
#@end
//}

riscv-testsの@<code>{rv64uc-p-}から始まるテストを実行し、成功することを確認してください。