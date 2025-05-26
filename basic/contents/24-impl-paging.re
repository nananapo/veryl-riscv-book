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

===={sv39process} アドレス変換プロセス (Sv39)

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

ページテーブルエントリをフェッチしてアドレス変換を行うモジュール(ptw)を作成します。
まず、MODEがBareのとき(仮想アドレス = 物理アドレス)の動作を実装し、
Sv39を@<secref>{impl-sv39}で実装します。

=== CSRのインターフェースを実装する

ptwで使用するCSRをcsrunitモジュールから渡すためのインターフェースを定義します。

@<code>{src/ptw_ctrl_if.veryl}を作成し、次のように記述します
()。

//list[ptw_ctrl_if.veryl.empty][ (ptw_ctrl_if.veryl)]{
#@mapfile(scripts/24/empty-range/core/src/ptw_ctrl_if.veryl)
import eei::*;

interface ptw_ctrl_if {
    var priv: PrivMode;
    var satp: UIntX   ;
    var mxr : logic   ;
    var sum : logic   ;
    var mprv: logic   ;
    var mpp : PrivMode;

    modport master {
        priv: output,
        satp: output,
        mxr : output,
        sum : output,
        mprv: output,
        mpp : output,
    }

    modport slave {
        is_enabled: import,
        ..converse(master)
    }

    function is_enabled (
        is_inst: input logic,
    ) -> logic {
        if satp[msb-:4] == 0 {
            return 0;
        }
        if is_inst {
            return priv <= PrivMode::S;
        } else {
            return (if mprv ? mpp : priv) <= PrivMode::S;
        }
    }
}
#@end
//}

is_enabledは、CSRとアクセス目的からページングがページングが有効かどうかを判定する関数です。
Bareかどうかを判定した後に、命令フェッチかどうか(@<code>{is_inst})によって分岐しています。
命令フェッチのときはS-mode以下の特権レベルのときに有効になります。
ロードストアのとき、mstatus.MPRVが@<code>{1}ならmstatus.mpp、@<code>{0}なら現在の特権レベルがS-mode以下なら有効になります。

=== Bareだけのptwモジュールを作成する

@<code>{src/ptw.veryl}を作成し、次のようなポートを記述します
()。

//list[ptw.veryl.empty.port][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,port)
import eei::*;

module ptw (
    clk    : input   clock             ,
    rst    : input   reset             ,
    is_inst: input   logic             ,
    slave  : modport Membus::slave     ,
    master : modport Membus::master    ,
    ctrl   : modport ptw_ctrl_if::slave,
) {
#@end
//}

@<code>{slave}はcoreモジュール側から仮想アドレスによる要求を受け付けるためのインターフェース、
@<code>{master}はmmio_conterollerモジュール側に物理アドレスによるアクセスを行うためのインターフェースです。

@<code>{is_inst}を使い、ページングが有効かどうか判定します
()。

//list[ptw.veryl.empty.paging_enabled][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,paging_enabled)
    let paging_enabled: logic = ctrl.is_enabled(is_inst);
#@end
//}

状態の管理のために@<code>{State}型を定義します
()。

//list[ptw.veryl.empty.state][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,state)
    enum State {
        IDLE,
        EXECUTE_READY,
        EXECUTE_VALID,
    }

    var state: State;
#@end
//}

 : @<code>{State::IDLE}
    @<code>{slave}から要求を受け付け、@<code>{master}に物理アドレスでアクセスします。
    @<code>{master}の@<code>{ready}が@<code>{1}なら@<code>{State::EXECUTE_VALID}、
    @<code>{0}なら@<code>{EXECUTE_READY}に状態を移動します。
 : @<code>{State::EXECUTE_READY}
    @<code>{master}に物理アドレスでメモリアクセスを要求し続けます。
    @<code>{master}の@<code>{ready}が@<code>{1}なら状態を@<code>{State::EXECUTE_VALID}に移動します。
 : @<code>{State::EXECUTE_VALID}
    @<code>{master}からのレスポンスを待ちます。
    @<code>{master}の@<code>{rvalid}が@<code>{1}のとき、
    @<code>{State::IDLE}と同じように@<code>{slave}からの要求を受け付けます。
    @<code>{slave}が何も要求していないなら、状態を@<code>{State::IDLE}に移動します。

@<code>{slave}からの要求を保存しておくためのインターフェースをインスタンス化しておきます
()。

//list[ptw.veryl.empty.save][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,save)
    inst slave_saved: Membus;
#@end
//}

状態に基づいて、@<code>{master}に要求を割り当てます
()。
@<code>{master}に要求を割り当てるとき、
アドレスだけ@<code>{physical_addr}レジスタの値を割り当てるようにしておきます。

//list[ptw.veryl.empty.phy][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,phy)
    var physical_addr: Addr;
#@end
//}

//list[ptw.veryl.empty.assign_master][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,assign_master)
    function assign_master (
        addr : input Addr                        ,
        wen  : input logic                       ,
        wdata: input logic<MEMBUS_DATA_WIDTH>    ,
        wmask: input logic<MEMBUS_DATA_WIDTH / 8>,
    ) {
        master.valid = 1;
        master.addr  = addr;
        master.wen   = wen;
        master.wdata = wdata;
        master.wmask = wmask;
    }

    function accept_request_comb () {
        if slave.ready && slave.valid && !paging_enabled {
            assign_master(slave.addr, slave.wen, slave.wdata, slave.wmask);
        }
    }

    always_comb {
        master.valid = 0;
        master.addr  = 0;
        master.wen   = 0;
        master.wdata = 0;
        master.wmask = 0;

        case state {
            State::IDLE         : accept_request_comb();
            State::EXECUTE_READY: assign_master      (physical_addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
            State::EXECUTE_VALID: if master.rvalid {
                accept_request_comb();
            }
            default: {}
        }
    }
#@end
//}

状態に基づいて、@<code>{slave}に@<code>{ready}と結果を割り当てます
()。

//list[ptw.veryl.empty.assign_slave][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,assign_slave)
    always_comb {
        slave.ready  = 0;
        slave.rvalid = 0;
        slave.rdata  = 0;
        slave.expt   = 0;

        case state {
            State::IDLE         : slave.ready = 1;
            State::EXECUTE_VALID: {
                slave.ready  = master.rvalid;
                slave.rvalid = master.rvalid;
                slave.rdata  = master.rdata;
                slave.expt   = master.expt;
            }
            default: {}
        }
    }
#@end
//}

状態を遷移する処理を記述します
()。
要求を受け入れるとき、@<code>{slave_saved}に要求を保存します。

//list[ptw.veryl.empty.ff][ (ptw.veryl)]{
#@maprange(scripts/24/empty-range/core/src/ptw.veryl,ff)
    function accept_request_ff () {
        slave_saved.valid = slave.ready && slave.valid;
        if slave.ready && slave.valid {
            slave_saved.addr  = slave.addr;
            slave_saved.wen   = slave.wen;
            slave_saved.wdata = slave.wdata;
            slave_saved.wmask = slave.wmask;
            if paging_enabled {
                // TODO
            } else {
                state         = if master.ready ? State::EXECUTE_VALID : State::EXECUTE_READY;
                physical_addr = slave.addr;
            }
        } else {
            state = State::IDLE;
        }
    }

    function on_clock () {
        case state {
            State::IDLE         : accept_request_ff();
            State::EXECUTE_READY: if master.ready {
                state = State::EXECUTE_VALID;
            }
            State::EXECUTE_VALID: if master.rvalid {
                accept_request_ff();
            }
            default: {}
        }
    }

    function on_reset () {
        state             = State::IDLE;
        physical_addr     = 0;
        slave_saved.valid = 0;
        slave_saved.addr  = 0;
        slave_saved.wen   = 0;
        slave_saved.wdata = 0;
        slave_saved.wmask = 0;
    }

    always_ff {
        if_reset {
            on_reset();
        } else {
            on_clock();
        }
    }
#@end
//}

=== ptwモジュールをインスタンス化する

topモジュールでptwモジュールをインスタンス化します。

ptwモジュールはmmio_controllerモジュールの前で仮想アドレスを物理アドレスに変換するモジュールです。
ptwモジュールとmmio_controllerモジュールの間のインターフェースを作成します
()。

//list[top.veryl.empty.intr][ (top.veryl)]{
#@maprange(scripts/24/empty-range/core/src/top.veryl,intr)
    inst ptw_membus     : Membus;
#@end
//}

調停処理をptwモジュール向けのものに変更します
()。

//list[top.veryl.empty.arb][ (top.veryl)]{
#@maprange(scripts/24/empty-range/core/src/top.veryl,arb)
    always_ff {
        if_reset {
            memarb_last_i = 0;
        } else {
            if @<b>|ptw|_membus.ready {
                memarb_last_i = !d_membus.valid;
            }
        }
    }

    always_comb {
        i_membus.ready  = @<b>|ptw|_membus.ready && !d_membus.valid;
        i_membus.rvalid = @<b>|ptw|_membus.rvalid && memarb_last_i;
        i_membus.rdata  = @<b>|ptw|_membus.rdata;
        i_membus.expt   = @<b>|ptw|_membus.expt;

        d_membus.ready  = @<b>|ptw|_membus.ready;
        d_membus.rvalid = @<b>|ptw|_membus.rvalid && !memarb_last_i;
        d_membus.rdata  = @<b>|ptw|_membus.rdata;
        d_membus.expt   = @<b>|ptw|_membus.expt;

        @<b>|ptw|_membus.valid = i_membus.valid | d_membus.valid;
        if d_membus.valid {
            @<b>|ptw|_membus.addr  = d_membus.addr;
            @<b>|ptw|_membus.wen   = d_membus.wen;
            @<b>|ptw|_membus.wdata = d_membus.wdata;
            @<b>|ptw|_membus.wmask = d_membus.wmask;
        } else {
            @<b>|ptw|_membus.addr  = i_membus.addr;
            @<b>|ptw|_membus.wen   = 0; // 命令フェッチは常に読み込み
            @<b>|ptw|_membus.wdata = 'x;
            @<b>|ptw|_membus.wmask = 'x;
        }
    }
#@end
//}

今処理している要求、
または今のクロックから処理し始める要求が命令フェッチによるものか判定する変数を作成します
()。

//list[top.veryl.empty.is_inst][ (top.veryl)]{
#@maprange(scripts/24/empty-range/core/src/top.veryl,is_inst)
    let ptw_is_inst  : logic = (i_membus.ready && i_membus.valid) || // inst ack or
     !(d_membus.ready && d_membus.valid) && memarb_last_i; // data not ack & last ack is inst
#@end
//}


ptwモジュールをインスタンス化します
()

//list[top.veryl.empty.ptw][ (top.veryl)]{
#@maprange(scripts/24/empty-range/core/src/top.veryl,ptw)
    inst ptw_ctrl: ptw_ctrl_if;
    inst paging_unit: ptw (
        clk                 ,
        rst                 ,
        is_inst: ptw_is_inst,
        slave  : ptw_membus ,
        master : mmio_membus,
        ctrl   : ptw_ctrl   ,
    );
#@end
//}

csrunitモジュールとptwモジュールを@<code>{ptw_ctrl_if}インターフェースで接続するために、
coreモジュールにポートを追加します
()。

//list[core.veryl.empty.port][ (core.veryl)]{
#@maprange(scripts/24/empty-range/core/src/core.veryl,port)
module core (
    clk     : input   clock               ,
    rst     : input   reset               ,
    i_membus: modport core_inst_if::master,
    d_membus: modport core_data_if::master,
    led     : output  UIntX               ,
    aclint  : modport aclint_if::slave    ,
    @<b>|ptw_ctrl: modport ptw_ctrl_if::master ,|
) {
#@end
//}

//list[top.veryl.empty.core][ (top.veryl)]{
#@maprange(scripts/24/empty-range/core/src/top.veryl,core)
    inst c: core (
        clk                      ,
        rst                      ,
        i_membus: i_membus_core  ,
        d_membus: d_membus_core  ,
        led                      ,
        aclint  : aclint_core_bus,
        @<b>|ptw_ctrl                 ,|
    );
#@end
//}

csrunitモジュールにポートを追加し、CSRを割り当てます
()。

//list[csrunit.veryl.empty.port][ (csrunit.veryl)]{
#@maprange(scripts/24/empty-range/core/src/csrunit.veryl,port)
    membus     : modport core_data_if::master    ,
    @<b>|ptw_ctrl   : modport ptw_ctrl_if::master     ,|
) {
#@end
//}

//list[core.veryl.empty.csru][ (core.veryl)]{
#@maprange(scripts/24/empty-range/core/src/core.veryl,csru)
        membus     : d_membus             ,
        @<b>|ptw_ctrl                          ,|
    );
#@end
//}

//list[csrunit.veryl.empty.assign][ (csrunit.veryl)]{
#@maprange(scripts/24/empty-range/core/src/csrunit.veryl,assign)
    always_comb {
        ptw_ctrl.priv = mode;
        ptw_ctrl.satp = satp;
        ptw_ctrl.mxr  = mstatus_mxr;
        ptw_ctrl.sum  = mstatus_sum;
        ptw_ctrl.mprv = mstatus_mprv;
        ptw_ctrl.mpp  = mstatus_mpp;
    }
#@end
//}

=={impl-sv39} Sv39の実装

ptwモジュールに、Sv39を実装します。
ここで定義する関数は、コメントと@<secref>{sv39process}を参考に動作を確認してください。

==={define_const} 定数の定義

ptwモジュールで使用する定数とユーティリティ関数を実装します。

@<code>{src/sv39util.veryl}を作成し、次のように記述します
()。
定数は@<secref>{sv39process}で使用しているものと同じです。

//list[sv39util.veryl.sv39][ (sv39util.veryl)]{
#@mapfile(scripts/24/sv39-range/core/src/sv39util.veryl)
import eei::*;
package sv39util {
    const PAGESIZE: u32      = 12;
    const PTESIZE : u32      = 8;
    const LEVELS  : logic<2> = 3;

    type Level = logic<2>;

    // 有効な仮想アドレスか判定する
    function is_valid_vaddr (
        va: input Addr,
    ) -> logic {
        let hiaddr: logic<26> = va[msb:38];
        return &hiaddr || &~hiaddr;
    }

    // 仮想アドレスのVPN[level]フィールドを取得する
    function vpn (
        va   : input Addr ,
        level: input Level,
    ) -> logic<9> {
        return case level {
            0      : va[20:12],
            1      : va[29:21],
            2      : va[38:30],
            default: 0,
        };
    }

    // 最初にフェッチするPTEのアドレスを取得する
    function get_first_pte_address (
        satp: input UIntX,
        va  : input Addr ,
    ) -> Addr {
        return {1'b0 repeat XLEN - 44 - PAGESIZE, satp[43:0], 1'b0 repeat PAGESIZE} // a
         + {1'b0 repeat XLEN - 9 - $clog2(PTESIZE), va[38:30], 1'b0 repeat $clog2(PTESIZE)}; // vpn[2]
    }
}
#@end
//}

==={define_PTE} PTEの定義

Sv39のPTEのビットを分かりやすく取得するために、
次のインターフェースを定義します。

@<code>{src/pte.veryl}を作成し、次のように記述します
()。

//list[pte.veryl.sv39.bits][ (pte.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/pte.veryl,bits)
import eei::*;
import sv39util::*;

interface PTE39 {
    var value: UIntX;

    function v () -> logic { return value[0]; }
    function r () -> logic { return value[1]; }
    function w () -> logic { return value[2]; }
    function x () -> logic { return value[3]; }
    function u () -> logic { return value[4]; }
    function a () -> logic { return value[6]; }
    function d () -> logic { return value[7]; }

    function reserved -> logic<10> { return value[63:54]; }

    function ppn2 () -> logic<26> { return value[53:28]; }
    function ppn1 () -> logic<9> { return value[27:19]; }
    function ppn0 () -> logic<9> { return value[18:10]; }
    function ppn  () -> logic<44> { return value[53:10]; }
}
#@end
//}

PTEを使ったユーティリティ関数を追加します
()。

//list[pte.veryl.sv39.func][ (pte.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/pte.veryl,func)
    // leaf PTEか判定する
    function is_leaf () -> logic { return r() || x(); }

    // leaf PTEのとき、PPNがページサイズに整列されているかどうかを判定する
    function is_ppn_aligned (
        level: input Level,
    ) -> logic {
        return case level {
            0      : 1,
            1      : ppn0() == 0,
            2      : ppn1() == 0 && ppn0() == 0,
            default: 1,
        };
    }

    // 有効なPTEか判定する
    function is_valid (
        level: input Level,
    ) -> logic {
        if !v() || reserved() != 0 || !r() && w() {
            return 0;
        }
        if is_leaf() && !is_ppn_aligned(level) {
            return 0;
        }
        if !is_leaf() && level == 0 {
            return 0;
        }
        return 1;
    }

    // 次のlevelのPTEのアドレスを得る
    function get_next_pte_addr (
        level: input Level,
        va   : input Addr ,
    ) -> Addr {
        return {1'b0 repeat XLEN - 44 - PAGESIZE, ppn(), 1'b0 repeat PAGESIZE} + // a
         {1'b0 repeat XLEN - 9 - $clog2(PTESIZE), vpn(va, level - 1), 1'b0 repeat $clog2(PTESIZE)};
    }

    // PTEと仮想アドレスから物理アドレスを生成する
    function get_physical_address (
        level: input Level,
        va   : input Addr ,
    ) -> Addr {
        return {
            8'b0, ppn2(), case level {
                0: {
                    ppn1(), ppn0()
                },
                1: {
                    ppn1(), vpn(va, 0)
                },
                2: {
                    vpn(va, 1), vpn(va, 0)
                },
                default: 18'b0,
            }, va[11:0]
        };
    }

    // A、Dビットを更新する必要があるかを判定する
    function need_update_ad (
        wen: input logic,
    ) -> logic {
        return !a() || wen && !d();
    }

    // A, Dビットを更新したPTEの下位8ビットを生成する
    function get_updated_ad (
        wen: input logic,
    ) -> logic<8> {
        let a: logic<8> = 1 << 6;
        let d: logic<8> = wen as u8 << 7;
        return value[7:0] | a | d;
    }
#@end
//}

=== ptwモジュールの実装

sv39utilパッケージをimportします
()。

//list[ptw.veryl.sv39.import][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,import)
import sv39util::*;
#@end
//}

PTE39インターフェースをインスタンス化します
()。
@<code>{value}には@<code>{master}のロード結果を割り当てます。

//list[ptw.veryl.sv39.pte][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,pte)
    inst pte      : PTE39;
    assign pte.value = master.rdata;
#@end
//}

TODO 図

仮想アドレスを変換するための状態を追加します
()。
本章ではページングが有効な時に、
状態がTODO図のように遷移するようにします。

//list[ptw.veryl.sv39.State][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,State)
    enum State {
        IDLE,
        @<b>|WALK_READY,|
        @<b>|WALK_VALID,|
        @<b>|SET_AD,|
        EXECUTE_READY,
        EXECUTE_VALID,
        @<b>|PAGE_FAULT,|
    }
#@end
//}

現在のPTEのlevel(@<code>{level})、
PTEのアドレス(@<code>{taddr})、
要求によって更新されるPTEの下位8ビットを格納するためのレジスタを定義します
()。

//list[ptw.veryl.sv39.reg][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,reg)
    var physical_addr: Addr    ;
    @<b>|var taddr        : Addr    ;|
    @<b>|var level        : Level   ;|
    @<b>|var wdata_ad     : logic<8>;|
#@end
//}

//list[ptw.veryl.sv39.reset][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,reset)
    function on_reset () {
        state             = State::IDLE;
        physical_addr     = 0;
        @<b>|taddr             = 0;|
        @<b>|level             = 0;|
#@end
//}


PTEのフェッチとA、Dビットの更新のために@<code>{master}に要求を割り当てます
()。
PTEは@<code>{taddr}を使ってアクセスし、
A、Dビットの更新では下位8ビットのみの書き込みマスクを設定しています。

//list[ptw.veryl.sv39.assign_master][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,assign_master)
case state {
    State::IDLE      : accept_request_comb();
    @<b>|State::WALK_READY: assign_master      (taddr, 0, 0, 0);|
    @<b>|State::SET_AD    : assign_master      (taddr, 1, // wen = 1|
    @<b>| {1'b0 repeat MEMBUS_DATA_WIDTH - 8, wdata_ad}, // wdata|
    @<b>| {1'b0 repeat XLEN / 8 - 1, 1'b1} // wmask|
    @<b>|);|
    State::EXECUTE_READY: assign_master(physical_addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
    State::EXECUTE_VALID: if master.rvalid {
        accept_request_comb();
    }
    default: {}
}
#@end
//}

@<code>{slave}への結果の割り当てで、ページフォルトが発生していた場合の結果を割り当てます
()。

//list[ptw.veryl.sv39.assign_slave][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,assign_slave)
State::PAGE_FAULT: {
    slave.rvalid          = 1;
    slave.expt.valid      = 1;
    slave.expt.page_fault = 1;
}
#@end
//}

ページングが有効なときの要求を受け入れる動作を実装します
()。
仮想アドレスが有効かどうかでページフォルトを判定し、@<code>{taddr}レジスタには最初のPTEのアドレスを割り当てます。
@<code>{level}の初期値はLEVELS - 1とします。

//list[ptw.veryl.sv39.accept][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,accept)
if paging_enabled {
    @<b>|state = if is_valid_vaddr(slave.addr) ? State::WALK_READY : State::PAGE_FAULT;|
    @<b>|taddr = get_first_pte_address(ctrl.satp, slave.addr);|
    @<b>|level = LEVELS - 1;|
} else {
    state         = if master.ready ? State::EXECUTE_VALID : State::EXECUTE_READY;
    physical_addr = slave.addr;
}
#@end
//}

ページフォルトが発生したとき、状態を@<code>{State::IDLE}に戻します
()。

//list[ptw.veryl.sv39.clockpf][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,clockpf)
State::PAGE_FAULT: state = State::IDLE;
#@end
//}

A、Dビットを更新するとき、メモリが書き込み要求を受け入れたら状態を@<code>{State::EXECUTE_READY}に移動します
()。

//list[ptw.veryl.sv39.clockad][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,clockad)
State::SET_AD: if master.ready {
    state = State::EXECUTE_READY;
}
#@end
//}

PTEと要求から、ページにアクセスする権限があるかどうかを確認する関数を定義します
()。
条件の詳細は@<secref>{sv39process}を確認してください。

//list[ptw.veryl.sv39.check][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,check)
    function check_permission (
        req: modport Membus::all_input,
    ) -> logic {
        let priv: PrivMode = if is_inst || !ctrl.mprv ? ctrl.priv : ctrl.mpp;

        // U-mode access with PTE.U=0
        let u_u0: logic = priv == PrivMode::U && !pte.u();
        // S-mode load/store with PTE.U=1 & sum=0
        let sd_u1: logic = !is_inst && priv == PrivMode::S && pte.u() && !ctrl.sum;
        // S-mode execute with PTE.U=1
        let si_u1: logic = is_inst && priv == PrivMode::S && pte.u();

        // execute without PTE.X
        let x: logic = is_inst && !pte.x();
        // write without PTE.W
        let w: logic = !is_inst && req.wen && !pte.w();
        // read without PTE.R (MXR)
        let r: logic = !is_inst && !req.wen && !pte.r() && !(pte.x() && ctrl.mxr);

        return !(u_u0 | sd_u1 | si_u1 | x | w | r);
    }
#@end
//}

PTEをフェッチし、ページフォルトの判定、次のPTEのフェッチ、A、Dビットを更新する状態への遷移を実装します
()。

//list[ptw.veryl.sv39.walk][ (ptw.veryl)]{
#@maprange(scripts/24/sv39-range/core/src/ptw.veryl,walk)
State::WALK_READY: if master.ready {
    state = State::WALK_VALID;
}
State::WALK_VALID: if master.rvalid {
    if !pte.is_valid(level) {
        state = State::PAGE_FAULT;
    } else {
        if pte.is_leaf() {
            if check_permission(slave_saved) {
                physical_addr = pte.get_physical_address(level, slave_saved.addr);
                if pte.need_update_ad(slave_saved.wen) {
                    state    = State::SET_AD;
                    wdata_ad = pte.get_updated_ad(slave_saved.wen);
                } else {
                    state = State::EXECUTE_READY;
                }
            } else {
                state = State::PAGE_FAULT;
            }
        } else {
            // read next pte
            state = State::WALK_READY;
            taddr = pte.get_next_pte_addr(level, slave_saved.addr);
            level = level - 1;
        }
    }
}
#@end
//}

これでSv39をptwモジュールに実装できました。

== SFENCE.VMA命令の実装

SFENCE.VMA命令は、
SFENCE.VMA命令を実行する以前のストア命令が反映されたことを保証する命令です。
S-mode以上の特権レベルのときに実行できます。

基本編ではすべてのメモリアクセスを直列に行うため、何もしない命令として定義します。

=== SFENCE.VMA命令をデコードする

SFENCE.VMA命令を有効な命令としてデコードします
()。

//list[inst_decoder.veryl.sfence.system][ (inst_decoder.veryl)]{
#@maprange(scripts/24/sfence-range/core/src/inst_decoder.veryl,system)
 bits == 32'h10200073 || //SRET
 bits == 32'h10500073 || // WFI
 f7 == 7'b0001001 && bits[11:7] == 0, // SFENCE.VMA
#@end
//}

=== 特権レベルの確認、mstatus.TVMを実装する

S-mode未満の特権レベルで実行しようとしたとき、
Illegal instruction例外が発生します。

mstatus.TVMはS-modeのときにsatpレジスタにアクセスできるか、
SFENCE.VMA命令を実行できるかを制御するビットです。
mstatus.TVMが@<code>{1}にされているとき、Illegal instruction例外が発生します。

mstatus.TVMを書き込めるようにします
()。

//list[csrunit.veryl.sfence.WMASK][ (csrunit.veryl)]{
#@maprange(scripts/24/sfence-range/core/src/csrunit.veryl,WMASK)
    const MSTATUS_WMASK   : UIntX = 'h0000_0000_00@<b>|7|e_19aa as UIntX;
#@end
//}

//list[csrunit.veryl.sfence.tvm][ (csrunit.veryl)]{
#@maprange(scripts/24/sfence-range/core/src/csrunit.veryl,tvm)
    let mstatus_tvm : logic    = mstatus[20];
#@end
//}

特権レベルを確認して、例外を発生させます
()。

//list[csrunit.veryl.sfence.is][ (csrunit.veryl)]{
#@maprange(scripts/24/sfence-range/core/src/csrunit.veryl,is)
    let is_sfence_vma: logic = ctrl.is_csr && ctrl.funct7 == 7'b0001001 && ctrl.funct3 == 0 && rd_addr == 0;
#@end
//}

//list[csrunit.veryl.sfence.expt][ (csrunit.veryl)]{
#@maprange(scripts/24/sfence-range/core/src/csrunit.veryl,expt)
    let expt_tvm: logic = (is_sfence_vma && mode <: PrivMode::S) || (mstatus_tvm && mode == PrivMode::S && (is_wsc && csr_addr == CsrAddr::SATP || is_sfence_vma));
#@end
//}

//list[csrunit.veryl.sfence.raise][ (csrunit.veryl)]{
#@maprange(scripts/24/sfence-range/core/src/csrunit.veryl,raise)
    let raise_expt: logic = valid && (expt_info.valid || expt_write_readonly_csr || expt_csr_priv_violation || expt_zicntr_priv || expt_trap_return_priv || expt_memory_fault @<b>{|| expt_tvm});
    let expt_cause: UIntX = switch {
        ...
        @<b>|expt_tvm               : CsrCause::ILLEGAL_INSTRUCTION,|
        default                : 0,
    };
#@end
//}

== パイプラインをフラッシュする

本書はパイプライン化したCPUを実装しているため、
命令フェッチは前の命令を待たずに次々に行われます。

=== CSRの変更

mstatusレジスタのMXR、SUM、TVMビット、
satpレジスタを書き換えたとき、
CSRを書き換える命令の後ろの命令は、
変更が反映されていない状態でフェッチした命令になっている可能性があります。

CSRの書き換えをページングに反映するために、
特定のCSRを書き換えたらパイプラインをフラッシュするようにします。

csrunitモジュールに、フラッシュするためのフラグを追加します
()。

//list[csrunit.veryl.flushcsr.port][ (csrunit.veryl)]{
#@maprange(scripts/24/flushcsr-range/core/src/csrunit.veryl,port)
@<b>|flush      : output  logic                   ,|
minstret   : input   UInt64                  ,
#@end
//}

//list[core.veryl.flushcsr.csru][ (core.veryl)]{
#@maprange(scripts/24/flushcsr-range/core/src/core.veryl,csru)
@<b>|flush      : csru_flush           ,|
minstret                          ,
#@end
//}

//list[core.veryl.flushcsr.reg][ (core.veryl)]{
#@maprange(scripts/24/flushcsr-range/core/src/core.veryl,reg)
    var csru_trap_return: logic   ;
    @<b>|var csru_flush      : logic   ;|
    var minstret        : UInt64  ;
#@end
//}

@<code>{flush}はsatpレジスタ、mstatusレジスタが変更されるときに@<code>{1}になるようにします
()。


//list[csrunit.veryl.flushcsr.logic][ (csrunit.veryl)]{
#@maprange(scripts/24/flushcsr-range/core/src/csrunit.veryl,logic)
    let wsc_flush: logic = is_wsc && (csr_addr == CsrAddr::SATP || csr_addr == CsrAddr::MSTATUS);
    assign flush     = valid && wsc_flush;
#@end
//}

coreモジュールで、制御ハザードが発生したことにします
()。

//list[core.veryl.flushcsr.hazard][ (core.veryl)]{
#@maprange(scripts/24/flushcsr-range/core/src/core.veryl,hazard)
    assign control_hazard         = mems_valid && (csru_raise_trap || mems_ctrl.is_jump || memq_rdata.br_taken @<b>{|| csru_flush});
    assign control_hazard_pc_next = if csru_raise_trap ? csru_trap_vector : // trap
     @<b>{if csru_flush ? mems_pc + 4 :} memq_rdata.jump_addr; // @<b>{flush or} jump
#@end
//}

=== FENCE.I命令の実装

あるアドレスにデータを書き込むとき、
データを書き込んだ後の命令が書き換えられたアドレスの命令だった場合、
命令のビット列はデータが書き換えられる前のものになる可能性があります。

FENCE.I命令は、FENCE.I命令の後の命令のフェッチ処理がストア命令の完了後に行われることを保証する命令です。

ユーザーのアプリケーションのプログラムをページに書き込んで実行するとき、
ページへの書き込みを反映させるために使用します。

FENCE.I命令を判定し、パイプラインをフラッシュする条件に設定します
()。

//list[csrunit.veryl.fence.is][ (csrunit.veryl)]{
#@maprange(scripts/24/fence-range/core/src/csrunit.veryl,is)
    let is_fence_i: logic = inst_bits[6:0] == OP_MISC_MEM && ctrl.funct3 == 3'b001;
#@end
//}

//list[csrunit.veryl.fence.flush][ (csrunit.veryl)]{
#@maprange(scripts/24/fence-range/core/src/csrunit.veryl,flush)
    assign flush     = valid && (wsc_flush @<b>{|| is_fence_i});
#@end
//}