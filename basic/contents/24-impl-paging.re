= S-modeの実装 (2. 仮想記憶システム)

== 概要

=== 仮想記憶システム

TODO 図

仮想記憶(Virtual Memory)とは、メモリを管理する手法の一種です。
論理的なアドレス(logical address、論理アドレス)を物理的なアドレス(physical address、物理アドレス)に変換することにより、
実際のアドレス(real address、実アドレス)空間とは異なる仮想的なアドレス(virtual address、仮想アドレス)空間を提供することができます。

仮想記憶を利用すると、次のような動作を実現できます。

 1. 連続していない物理アドレス空間を仮想的に連続したアドレス空間として扱う。
 1. 特定のアドレスにしか配置できない(特定のアドレスで動くことを前提としている)プログラムを、そのアドレスとは異なる物理アドレスに配置して実行する。
 1. アプリケーションごとにアドレス空間を分離する。

一般的に仮想記憶システムはハードウェアによって提供されます。
メモリアクセスを処理するハードウェア部品のことをメモリ管理ユニット(Memory Management Unit, MMU)と呼びます。

=== ページング方式

図

仮想記憶システムを実現する方式の1つにページング方式(Paging)があります。
ページング方式は、物理アドレス空間の一部をページ(Page)という単位に割り当て、
ページテーブル(Page Table)にページを参照するための情報を格納します。
ページテーブルに格納する情報の単位のことをページテーブルエントリ(Page Table Entry)と呼びます。
論理アドレスから物理アドレスへの変換はページテーブルにあるページテーブルエントリを参照して行います。
これ以降、ページテーブルエントリのことをPTEと呼びます。

RISC-Vの仮想記憶システムはページング方式を採用しており、
RV32I向けにはSv32、RV64I向けにはSv39、Sv48、Sv57が定義されています。

TODO 図

本章で実装するSv39のアドレス変換を簡単に説明します。

(a) satpレジスタのPPNフィールドと論理アドレスのフィールドからPTEの物理アドレスを作る。
(b) PTEを読み込む。PTEが有効なものか確認する。
(c) PTEがページを指しているとき、PTEに書かれている権限を確認してから最終的な物理アドレスを作る。
(d) PTEが次のPTEを指しているとき、PTEのフィールドと論理アドレスのフィールドから次のPTEの物理アドレスを作る。(b)に戻る。

satpレジスタは仮想記憶システムを制御するためのCSRです。
一番最初に参照するPTEのことをroot PTEと呼びます。
また、PTEがページを指しているとき、そのPTEのことをleaf PTEと呼びます。

TODO 図

このようにsatpレジスタと論理アドレス、PTEを使って多段階のメモリアクセスを行って論理アドレスを物理アドレスに変換します。
Sv39の場合、何段階で物理アドレスに変換できるかによってページサイズは4KiB、2MiB、1GiBと異なります。
これ以降、MMU内のページング方式を実現する部品のことをPTW(Page Table Walker)と呼びます@<fn>{ptw}。

//footnote[ptw][ページテーブルをたどってアドレスを変換するのでPage Table Walkerと呼びます。アドレスを変換することをPage Table Walkと呼ぶこともあります。]

=== satpレジスタ、アドレス変換プロセス

==== satpレジスタ

TODO satp

RISC-Vの仮想記憶システムはsatpレジスタによって制御します。

MODEは仮想アドレスの変換方式を指定するフィールドです。
方式と値はTODOテーブルのように対応しています。
MODEがBare(@<code>{0})のときはアドレス変換を行いません(仮想アドレス=物理アドレス)。

TODO テーブル

ASID(Address Space IDentifier)は仮想アドレスが属するアドレス空間のIDです。
動かすアプリケーションによってIDを変えることでMMUにアドレス変換の高速化のヒントを与えることができます
本章ではASIDを無視したアドレス変換を実装します@<fn>{tlb}。

//footnote[tlb][PTWはページエントリをキャッシュすることで高速化できます。ASIDが異なるときのキャッシュは利用することができません。キャッシュ機構(TLB)は応用編で実装します。]

TODO 図 (Sv39)

PPN(Physical Page Number)はroot PTEの物理アドレスの一部を格納するフィールドです。
root PTEのアドレスは仮想アドレスのVPNビットと組み合わせて作られます(TODO 図)。

==== アドレス変換プロセス (Sv39)

Sv39の仮想アドレスは次の方法によって物理アドレスに変換されます@<fn>{access-fault}。

//footnote[access-fault][RISC-VのMMUはPMP、PMAという仕組みで物理アドレス空間へのアクセスを制限することができ、それに違反した場合にアクセスフォルト例外を発生させます。本章ではPMP、PMAを実装していないのでアクセスフォルト例外に関する機能について説明せず、実装もしません。これらの機能は応用編で実装します。]

TODO プロセス

基本的にアドレス変換はS-mode、U-modeで有効になります。
TODO ここで説明
mstatusレジスタのMXR、SUM、MPRVビットを利用すると、プロセスTODOの特権レベル、PTEの権限について挙動を少し変更できます。
これらのビットについては実装するときに解説します。

アドレスの変換途中でPTEが不正な値だったり、ページが求める権限を持たずにページにアクセスにアクセスしようとした場合、
アクセスする目的に応じたページフォルト(Page fault)例外が発生します。
命令フェッチはInstruction page fault例外、ロード命令はLoad page fault例外、ストアとAMO命令はStore/AMO page fault例外が発生します。

=== 実装順序

図

RISC-Vでは命令フェッチ、データのロードストアの両方でページングを利用できます。
命令フェッチ、データのロードストアのそれぞれのために2つのPTWを用意してもいいですが、
シンプルなアーキテクチャにするために本章では1つのPTWを共有することにします。
inst_fetcherモジュール、amounitモジュールは仮想アドレスを扱うことがありますが、
mmio_controllerモジュールは常に物理アドレス空間を扱います。
そのため、inst_fetcherモジュール、amounitモジュールとmmio_controllerモジュールの間にPTWを配置します(図TODO)。

TODO 図

本章では、仮想記憶システムを次の順序で実装します。

 1. 例外を伝達するインターフェースを実装する
 1. Bareにだけ対応したアドレス変換モジュールを実装する
 1. satpレジスタ、mstatusのMXR、SUM、MPRVビットを作成する
 1. Sv39を実装する
 1. SFENCE.VMA命令、FENCEI命令を実装する

== メモリインターフェースの例外の実装

PTWで発生した例外は、最終的にcsrunitモジュールで処理します。
そのために、例外の情報をメモリのインターフェースを使って伝達します。

ページングによって発生する例外のcauseを@<code>{CsrCause}型に追加してください
()。

//list[eei.veryl.CsrCause.def][ (eei.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/eei.veryl,CsrCause)
    INSTRUCTION_PAGE_FAULT = 12,
    LOAD_PAGE_FAULT = 13,
    STORE_AMO_PAGE_FAULT = 15,
#@end
//}

=== 例外を伝達する

==== 構造体の定義

@<code>{MemException}構造体を定義します
()。
メモリアクセス中に発生する例外の情報はこの構造体で管理します。

//list[eei.veryl.newexpt.def][ (eei.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/eei.veryl,def)
    struct MemException {
        valid     : logic,
        page_fault: logic,
    }
#@end
//}

@<code>{membus_if}、@<code>{core_data_if}、@<code>{core_inst_if}インターフェースに@<code>{MemException}構造体を追加します
()。
インターフェースの@<code>{rvalid}が@<code>{1}で、
構造体の@<code>{valid}と@<code>{is_page_fault}が@<code>{1}なら
ページフォルト例外が発生したことを示します。

//list[membus_if.veryl.newexpt.var][ (membus_if.veryl, core_data_if.veryl, core_inst_if.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/membus_if.veryl,var)
    var expt  : eei::MemException                ;
#@end
//}

//list[membus_if.veryl.newexpt.master][ (membus_if.veryl, core_data_if.veryl, core_inst_if.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/membus_if.veryl,master)
    modport master {
        ...
        @<b>|expt        : input ,|
        ...
    }
#@end
//}

//list[membus_if.veryl.newexpt.slave][ (membus_if.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/membus_if.veryl,slave)
    modport slave {
        ...
        @<b>|expt        : output,|
        ...
    }
#@end
//}

//list[membus_if.veryl.newexpt.response][ (membus_if.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/membus_if.veryl,response)
    modport response {
        rvalid: output,
        rdata : output,
        expt  : output,
    }
#@end
//}

==== mmio_controllerモジュールの対応

mmio_controllerモジュールで構造体の値をすべて@<code>{0}に設定します
()。
いまのところ、デバイスは例外を発生させません。

//list[mmio_controller.veryl.newexpt.comb][ (membus_if.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/mmio_controller.veryl,comb)
    always_comb {
        req_core.ready  = 0;
        req_core.rvalid = 0;
        req_core.rdata  = 0;
        req_core.expt   = 0;
#@end
//}

mmio_controllerモジュールからの例外情報を
@<code>{core_data_if}、@<code>{core_inst_if}インターフェースに伝達します。  

//list[top.veryl.newexpt.comb][ (top.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/top.veryl,comb)
    always_comb {
        i_membus.ready  = mmio_membus.ready && !d_membus.valid;
        i_membus.rvalid = mmio_membus.rvalid && memarb_last_i;
        i_membus.rdata  = mmio_membus.rdata;
        @<b>|i_membus.expt   = mmio_membus.expt;|

        d_membus.ready  = mmio_membus.ready;
        d_membus.rvalid = mmio_membus.rvalid && !memarb_last_i;
        d_membus.rdata  = mmio_membus.rdata;
        @<b>|d_membus.expt   = mmio_membus.expt;|
#@end
//}

==== inst_fetcherモジュールの対応

inst_fetcherモジュールからcoreモジュールに例外情報を伝達します。
まず、FIFOの型に例外情報を追加します
()。

//list[inst_fetcher.veryl.newexpt.fft][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,fft)
    struct fetch_fifo_type {
        addr: Addr                           ,
        bits: logic       <MEMBUS_DATA_WIDTH>,
        @<b>|expt: MemException                   ,|
    }
#@end
//}

//list[inst_fetcher.veryl.newexpt.ift][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,ift)
    struct issue_fifo_type {
        addr  : Addr        ,
        bits  : Inst        ,
        is_rvc: logic       ,
        @<b>|expt  : MemException,|
    }
#@end
//}

メモリからの例外情報を@<code>{fetch_fifo}に保存します
()。

//list[inst_fetcher.veryl.newexpt.fetch][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,fetch)
    always_comb {
        fetch_fifo_flush      = core_if.is_hazard;
        fetch_fifo_wvalid     = fetch_requested && mem_if.rvalid;
        fetch_fifo_wdata.addr = fetch_pc_requested;
        fetch_fifo_wdata.bits = mem_if.rdata;
        @<b>|fetch_fifo_wdata.expt = mem_if.expt;|
    }
#@end
//}

@<code>{fetch_fifo}から@<code>{issue_fifo}に例外情報を伝達します
()。
offsetが@<code>{6}で例外が発生しているとき、
32ビット幅の命令の上位16ビットを取得せずにすぐに@<code>{issue_fifo}に例外を書き込みます。

//list[inst_fetcher.veryl.newexpt.feif][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,feif)
    always_comb {
        let raddr : Addr                            = fetch_fifo_rdata.addr;
        let rdata : logic       <MEMBUS_DATA_WIDTH> = fetch_fifo_rdata.bits;
        @<b>|let expt  : MemException                    = fetch_fifo_rdata.expt;|
        let offset: logic       <3>                 = issue_pc_offset;

        fetch_fifo_rready     = 0;
        issue_fifo_wvalid     = 0;
        issue_fifo_wdata      = 0;
        @<b>|issue_fifo_wdata.expt = expt;|
#@end
//}

//list[inst_fetcher.veryl.newexpt.offset_comb][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,offset_comb)
    fetch_fifo_rready = 1;
    if rvcc_is_rvc @<b>{|| expt.valid} {
        issue_fifo_wvalid       = 1;
        issue_fifo_wdata.addr   = {raddr[msb:3], offset};
        issue_fifo_wdata.is_rvc = 1;
        issue_fifo_wdata.bits   = rvcc_inst32;
#@end
//}

//list[inst_fetcher.veryl.newexpt.offset_ff][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,offset_ff)
    if issue_pc_offset == 6 && !rvcc_is_rvc && !issue_is_rdata_saved @<b>|&& !fetch_fifo_rdata.expt.valid| {
        if fetch_fifo_rvalid {
            issue_is_rdata_saved = 1;
#@end
//}

@<code>{issue_fifo}からcoreモジュールに例外情報を伝達します
()。

//list[inst_fetcher.veryl.newexpt.issue][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/inst_fetcher.veryl,issue)
    always_comb {
        issue_fifo_flush  = core_if.is_hazard;
        issue_fifo_rready = core_if.rready;
        core_if.rvalid    = issue_fifo_rvalid;
        core_if.raddr     = issue_fifo_rdata.addr;
        core_if.rdata     = issue_fifo_rdata.bits;
        core_if.is_rvc    = issue_fifo_rdata.is_rvc;
        @<b>|core_if.expt      = issue_fifo_rdata.expt;|
    }
#@end
//}

==== amounitモジュールの対応

@<code>{state}が@<code>{State::Init}以外の時に例外が発生した場合、
すぐに結果を返すようにします
()。
例外が発生したクロックでは要求を受け付けないようにします。

//list[amounit.veryl.newexpt.slave][ (amounit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/amounit.veryl,slave)
    always_comb {
        slave.ready  = 0;
        slave.rvalid = 0;
        slave.rdata  = 0;
        @<b>|slave.expt   = master.expt;|
#@end
//}

//list[amounit.veryl.newexpt.slave_end][ (amounit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/amounit.veryl,slave_end)
            default: {}
        }

        @<b>|if state != State::Init && master.expt.valid {|
        @<b>|    slave.ready  = 0;|
        @<b>|    slave.rvalid = 1;|
        @<b>|}|
    }
#@end
//}

//list[amounit.veryl.newexpt.master_end][ (amounit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/amounit.veryl,master_end)
            State::AMOStoreValid: accept_request_comb();
            default             : {}
        }

        @<b>|if state != State::Init && master.expt.valid {|
        @<b>|    reset_master();|
        @<b>|}|
    }
#@end
//}

例外が発生したら、@<code>{state}を@<code>{State::Init}にリセットするようにします
()。

//list[amounit.veryl.newexpt.on_clock][ (amounit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/amounit.veryl,on_clock)
    function on_clock () {
        @<b>|if state != State::Init && master.expt.valid {|
        @<b>|    state = State::Init;|
        @<b>|} else {|
            case state {
                State::Init     : accept_request_ff();
#@end
//}

==== Instruction page fault例外の実装

命令フェッチ処理中にページフォルト例外が発生していたとき、
Instruction page fault例外を発生させます。
xtvalには例外が発生したアドレスを設定します
()。

//list[core.veryl.newexpt.inst][ (core.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/core.veryl,inst)
        @<b>|if i_membus.expt.valid {|
        @<b>|    // fault|
        @<b>|    exq_wdata.expt.valid = 1;|
        @<b>|    exq_wdata.expt.cause = CsrCause::INSTRUCTION_PAGE_FAULT;|
        @<b>|    exq_wdata.expt.value = ids_pc;|
        @<b>|} else| if !ids_inst_valid {
#@end
//}

==== ロード、ストア命令のpage fault例外の実装

ロード命令、ストア命令、A拡張の命令のメモリアクセス中にページフォルト例外が発生していたとき、
Load page fault例外、Store/AMO page fault例外を発生させます。

csrunitモジュールに、
メモリにアクセスする命令の例外情報を監視するためのポートを作成します
()。

//list[csrunit.veryl.newexpt.port][ (csrunit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/csrunit.veryl,port)
module csrunit (
    ...
    can_intr   : input   logic                   ,
    @<b>|mem_addr   : input   Addr                    ,|
    rdata      : output  UIntX                   ,
    ...
    @<b>|membus     : modport core_data_if::master    ,|
) {
#@end
//}

//list[core.veryl.newexpt.csru][ (core.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/core.veryl,csru)
    inst csru: csrunit (
        ...
        @<b>|mem_addr   : memu_addr            ,|
        ...
        @<b>|membus     : d_membus             ,|
    );
#@end
//}

例外を発生させます。

//list[csrunit.veryl.newexpt.fault][ (csrunit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/csrunit.veryl,fault)
    let expt_memory_fault    : logic = membus.rvalid && membus.expt.valid;
#@end
//}

//list[csrunit.veryl.newexpt.raise][ (csrunit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/csrunit.veryl,raise)
    let raise_expt: logic = valid && (expt_info.valid || expt_write_readonly_csr || expt_csr_priv_violation || expt_zicntr_priv || expt_trap_return_priv @<b>{|| expt_memory_fault});
    let expt_cause: UIntX = switch {
        ...
        @<b>|expt_memory_fault      : if ctrl.is_load ? CsrCause::LOAD_PAGE_FAULT : CsrCause::STORE_AMO_PAGE_FAULT,|
        default                : 0,
    };
#@end
//}

xtvalに例外が発生したアドレスを設定します。

//list[csrunit.veryl.newexpt.cause][ (csrunit.veryl)]{
#@maprange(scripts/24/newexpt-range/core/src/csrunit.veryl,cause)
    let expt_value: UIntX = switch {
        expt_info.valid                             : expt_info.value,
        expt_cause == CsrCause::ILLEGAL_INSTRUCTION : {1'b0 repeat XLEN - $bits(Inst), inst_bits},
        @<b>|expt_cause == CsrCause::LOAD_PAGE_FAULT     : mem_addr,|
        @<b>|expt_cause == CsrCause::STORE_AMO_PAGE_FAULT: mem_addr,|
        default                                     : 0
    };
#@end
//}

=== ページフォルトが発生した正確なアドレスを特定する

ページフォルト例外が発生したとき、
xtvalにはページフォルトが発生した仮想アドレスを格納します。

実は現状の実装では、
メモリにアクセスする操作がページの境界をまたぐとき、
ページフォルトが発生した正確な仮想アドレスをxtvalに格納できていません。

例えば、inst_fetcherモジュールで32ビット幅の命令を2回のメモリ読み込みでフェッチするとき、
1回目(下位16ビット)のロードは成功して、2回目(上位16ビット)のロードでページフォルトが発生したとします。
このとき、ページフォルトが発生したアドレスは2回目のロードでアクセスしたアドレスなのに、
xtvalには1回目のロードでアクセスしたアドレスが書き込まれます。

これに対処するために、例外が発生したアドレスのオフセットを例外情報に追加します
()。

//list[eei.veryl.exptoffset.def][ (eei.veryl)]{
#@maprange(scripts/24/exptoffset-range/core/src/eei.veryl,def)
    struct MemException {
        valid      : logic   ,
        page_fault : logic   ,
        @<b>|addr_offset: logic<3>,|
    }
#@end
//}

inst_fetcherモジュールで、
32ビット幅の命令の上位16ビットを読み込んで@<code>{issue_fifo}に書き込むときに、
オフセットを@<code>{2}に設定します
()。

//list[inst_fetcher.veryl.exptoffset.offset][ (inst_fetcher.veryl)]{
#@maprange(scripts/24/exptoffset-range/core/src/inst_fetcher.veryl,offset)
    if issue_is_rdata_saved {
        issue_fifo_wvalid                 = 1;
        issue_fifo_wdata.addr             = {issue_saved_addr[msb:3], offset};
        issue_fifo_wdata.bits             = {rdata[15:0], issue_saved_bits};
        issue_fifo_wdata.is_rvc           = 0;
        @<b>|issue_fifo_wdata.expt.addr_offset = 2;|
#@end
//}

tvalを生成するとき、オフセット足します。

//list[core.veryl.exptoffset.offset][ (core.veryl)]{
#@maprange(scripts/24/exptoffset-range/core/src/core.veryl,offset)
    exq_wdata.expt.valid = 1;
    exq_wdata.expt.cause = CsrCause::INSTRUCTION_PAGE_FAULT;
    exq_wdata.expt.value = ids_pc @<b>|+ {1'b0 repeat XLEN - 3, i_membus.expt.addr_offset}|;
#@end
//}

//list[csrunit.veryl.exptoffset.offset][ (csrunit.veryl)]{
#@maprange(scripts/24/exptoffset-range/core/src/csrunit.veryl,offset)
    let expt_value: UIntX = switch {
        expt_info.valid                             : expt_info.value,
        expt_cause == CsrCause::ILLEGAL_INSTRUCTION : {1'b0 repeat XLEN - $bits(Inst), inst_bits},
        expt_cause == CsrCause::LOAD_PAGE_FAULT     : mem_addr @<b>|+ {1'b0 repeat XLEN - 3, membus.expt.addr_offset}|,
        expt_cause == CsrCause::STORE_AMO_PAGE_FAULT: mem_addr @<b>|+ {1'b0 repeat XLEN - 3, membus.expt.addr_offset}|,
        default                                     : 0
    };
#@end
//}

== satpレジスタの作成

satpレジスタを実装します
()。
すべてのフィールドを読み書きできるように設定して、
値を@<code>{0}でリセットします。

//list[csrunit.veryl.satp.reg][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,reg)
    var satp      : UIntX ;
#@end
//}

//list[csrunit.veryl.satp.reset][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,reset)
    satp       = 0;
#@end
//}

//list[csrunit.veryl.satp.rdata][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,rdata)
    CsrAddr::SATP      : satp,
#@end
//}

//list[csrunit.veryl.satp.wmask][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,wmask)
    CsrAddr::SATP      : SATP_WMASK,
#@end
//}

//list[csrunit.veryl.satp.WMASK][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,WMASK)
    const SATP_WMASK      : UIntX = 'hffff_ffff_ffff_ffff;
#@end
//}

satpレジスタは、
MODEフィールド変更するときに書き込もうとしている値がサポートしないMODEなら、
satpレジスタの変更を全ビット無視すると定められています。

本章ではBareとSv39だけをサポートするため、
MODEには@<code>{0}と@<code>{8}のみ書き込めるようにして、
それ以外の値を書き込もうとしたらsatpレジスタへの書き込みを無視します。

//list[csrunit.veryl.satp.validate][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,validate)
    function validate_satp (
        satp : input UIntX,
        wdata: input UIntX,
    ) -> UIntX {
        // mode
        if wdata[msb-:4] != 0 && wdata[msb-:4] != 8 {
            return satp;
        }
        return wdata;
    }
#@end
//}

//list[csrunit.veryl.satp.write][ (csrunit.veryl)]{
#@maprange(scripts/24/satp-range/core/src/csrunit.veryl,write)
    CsrAddr::SATP      : satp       = validate_satp(satp, wdata);
#@end
//}

== mstatusのMXR、SUM、MPRVビットの作成

mstatusレジスタのMXR、SUM、MPRVビットを変更できるようにします
()。

//list[csrunit.veryl.mstatuses.WMASK_mstatus][ (csrunit.veryl)]{
#@maprange(scripts/24/mstatuses-range/core/src/csrunit.veryl,WMASK_mstatus)
    const MSTATUS_WMASK   : UIntX = 'h0000_0000_006@<b>|e|_19aa as UIntX;
#@end
//}

//list[csrunit.veryl.mstatuses.WMASK_sstatus][ (csrunit.veryl)]{
#@maprange(scripts/24/mstatuses-range/core/src/csrunit.veryl,WMASK_sstatus)
    const SSTATUS_WMASK   : UIntX = 'h0000_0000_000@<b>|c|_0122 as UIntX;
#@end
//}

それぞれのビットを示す変数を作成します
()。

//list[csrunit.veryl.mstatuses.reg][ (csrunit.veryl)]{
#@maprange(scripts/24/mstatuses-range/core/src/csrunit.veryl,reg)
    let mstatus_mxr : logic    = mstatus[19];
    let mstatus_sum : logic    = mstatus[18];
    let mstatus_mprv: logic    = mstatus[17];
#@end
//}

mstatus.MPRVは、M-mode以外のモードにトラップするときに@<code>{0}に設定すると定められています。
そのため、@<code>{trap_mode_next}を確認して@<code>{0}を設定します。

//list[csrunit.veryl.mstatuses.mprv][ (csrunit.veryl)]{
#@maprange(scripts/24/mstatuses-range/core/src/csrunit.veryl,mprv)
    } else if trap_return {
        @<b>|// set mstatus.mprv = 0 when new mode != M-mode|
        @<b>|if trap_mode_next <: PrivMode::M {|
        @<b>|    mstatus[17] = 0;|
        @<b>|}|
        if is_mret {
#@end
//}

== アドレス変換モジュール(PTW)の作成

== Sv39の実装

=== pte

=== ptw

== SFENCE.VMA命令の実装

== パイプラインをフラッシュする

=== CSRの変更

=== FENCE.I命令の実装
