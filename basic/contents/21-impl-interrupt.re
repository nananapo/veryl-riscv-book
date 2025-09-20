= M-modeの実装 (2. 割り込みの実装)

== 概要

=== 割り込みとは何か？

アプリケーションを記述するとき、キーボードやマウスの入力、時間の経過のようなイベントに起因して何らかのプログラムを実行したいことがあります。
例えばキーボードから入力を得たいとき、ポーリング(Polling)、または割り込み(Interrupt)という手法が利用されます。

#@# TODO できればポーリングの図

ポーリングとは、定期的に問い合わせを行う方式のことです。
例えばキーボード入力の場合、定期的にキーボードデバイスにアクセスして入力があるかどうかを確かめます。
1秒ごとに入力の有無を確認する場合、キーボードの入力から検知までに最大1秒の遅延が発生します。
確認頻度をあげると遅延を減らせますが、
長時間キーボード入力が無い場合、
入力の有無の確認頻度が上がる分だけ何も入力が無いデバイスに対する確認処理が実行されることになります。
この問題は、CPUからデバイスに問い合わせをする方式では解決できません。

入力の理想的な確認タイミングは入力が確認できるようになってすぐであるため、
入力があったタイミングでデバイス側からCPUにイベントを通知すればいいです。
これを実現するのが割り込みです。

#@# TODO できれば割り込みの図

割り込みとは、何らかのイベントの通知によって実行中のプログラムを中断し、通知内容を処理する方式のことです。
割り込みを使うと、ポーリングのように無駄にデバイスにアクセスをすることなく、入力の処理が必要な時にだけ実行できます。

==={riscv-interrupts} RISC-Vの割り込み

RISC-Vでは割り込み機能がCSRによって提供されます。
割り込みが発生するとトラップが発生します。
割り込みを発生させるようなイベントは外部割り込み、ソフトウェア割り込み、タイマ割り込みの3つに大別されます。

 : 外部割り込み (External Interrupt)
    コア外部のデバイスによって発生する割り込み。
    複数の外部デバイスの割り込みは割り込みコントローラ(@<chapref>{25-impl-plic})などによって調停(制御)されます。

 : ソフトウェア割り込み (Software Interrupt)
    CPUで動くソフトウェアが発生させる割り込み。
    CSR、もしくはメモリにマップされたレジスタ値の変更によって発生します。

 : タイマ割り込み (Timer Interrupt)
    タイマ回路(デバイス)によって引き起こされる割り込み。
    タイマの設定と時間経過によって発生します。

M-modeだけが実装されたRISC-VのCPUでは、次にような順序で割り込みが提供されます。
他に実装されている特権レベルがある場合については@<secref>{22-umode-csr|umode-int}、@<secref>{23-smode-csr|delegating-trap}で解説します。

 1. 割り込みを発生させるようなイベントがデバイスで発生する
 1. 割り込み原因に対応したmipレジスタのビットが@<code>{0}から@<code>{1}になる
 1. 割り込み原因に対応したmieレジスタのビットが@<code>{1}であることを確認する (@<code>{0}なら割り込みは発生しない)
 1. mstatus.MIEが@<code>{1}であることを確認する (@<code>{0}なら割り込みは発生しない)
 1. (割り込み(トラップ)開始)
 1. mstatus.MPIEにmstatus.MIEを格納する
 1. mstatus.MIEに@<code>{0}を格納する
 1. mtvecレジスタの値にジャンプする

mip(Machine Interrupt Pending)レジスタは、割り込みを発生させるようなイベントが発生したことを通知するMXLENビットのCSRです。
mie(Machine Interrupt Enable)レジスタは割り込みを許可するかを原因ごとに制御するMXLENビットのCSRです。
mstatus.MIEはすべての割り込みを許可するかどうかを制御する1ビットのフィールドです。
mieとmstatus.MIEのことを割り込みイネーブル(許可)レジスタと呼び、
特にmstatus.MIEのようなすべての割り込みを制御するビットのことをグローバル割り込みイネーブルビットと呼びます

割り込みの発生時にmstatus.MIEを@<code>{0}にすることで、割り込みの処理中に割り込みが発生することを防いでいます。
また、トラップから戻る(MRET命令を実行する)ときは、mstatus.MPIEの値をmstatus.MIEに書き戻すことで割り込みの許可状態を戻します。

=== 割り込みの優先順位

RISC-Vには外部割り込み、ソフトウェア割り込み、タイマ割り込みがそれぞれM-mode、S-mode向けに用意されています。
それぞれの割り込みには@<table>{riscv.interrupt-priority}のような優先順位が定義されていて、
複数の割り込みを発生させられるときは優先順位が高い割り込みを発生させます。

//table[riscv.interrupt-priority][RISC-Vの割り込みの優先順位]{
cause	説明								優先順位
-------------------------------------------------------------
11		Machine external interrupt			高い
3		Machine software Interrupt			
7		Machine timer interrupt				
9		Supervisor external interrupt		
1		Supervisor software interrupt		
5		Supervisor timer interrupt			低い
//}

=== 割り込みの原因(cause)

それぞれの割り込みには原因を区別するための値(cause)が割り当てられています。
割り込みのcauseのMSBは@<code>{1}です。

@<code>{CsrCause}型に割り込みのcauseを追加します
(@<list>{eei.veryl.mmapcause.CsrCause})。

//list[eei.veryl.mmapcause.CsrCause][割り込みの原因の定義 (eei.veryl)]{
#@maprange(scripts/21/mmapcause-range/core/src/eei.veryl,CsrCause)
    enum CsrCause: UIntX {
        INSTRUCTION_ADDRESS_MISALIGNED = 0,
        ILLEGAL_INSTRUCTION = 2,
        BREAKPOINT = 3,
        LOAD_ADDRESS_MISALIGNED = 4,
        STORE_AMO_ADDRESS_MISALIGNED = 6,
        ENVIRONMENT_CALL_FROM_M_MODE = 11,
        @<b>|SUPERVISOR_SOFTWARE_INTERRUPT = 'h8000_0000_0000_0001,|
        @<b>|MACHINE_SOFTWARE_INTERRUPT = 'h8000_0000_0000_0003,|
        @<b>|SUPERVISOR_TIMER_INTERRUPT = 'h8000_0000_0000_0005,|
        @<b>|MACHINE_TIMER_INTERRUPT = 'h8000_0000_0000_0007,|
        @<b>|SUPERVISOR_EXTERNAL_INTERRUPT = 'h8000_0000_0000_0009,|
        @<b>|MACHINE_EXTERNAL_INTERRUPT = 'h8000_0000_0000_000b,|
    }
#@end
//}

=== ACLINT (Advanced Core Local Interruptor)

RISC-Vにはソフトウェア割り込みとタイマ割り込みを実現するデバイスの仕様であるACLINTが用意されています。
ACLINTは、SiFive社が開発したCLINT(Core-Local Interruptor)デバイスが基になった仕様です。

ACLINTにはMTIMER、MSWI、SSWIの3つのデバイスが定義されています。
MTIMERデバイスはタイマ割り込み、MSWIとSSWIデバイスはソフトウェア割り込み向けのデバイスで、
それぞれmipレジスタのMTIP、MSIP、SSIPビットに状態を通知します。

//image[aclint-mmio][ACLINTのメモリマップ][width=40%]

本書ではACLINTを図@<img>{aclint-mmio}のようなメモリマップで実装します。
本章ではMTIMER、MSWIデバイスを実装し、@<secref>{23-smode-csr|impl-sswi}でSSWIデバイスを実装します。
デバイスの具体的な仕様については後で解説します。

メモリマップ用の定数をeeiパッケージに記述してください
(@<list>{eei.veryl.mmapcause.mmap})。

//list[eei.veryl.mmapcause.mmap][メモリマップ用の定数の定義 (eei.veryl)]{
#@maprange(scripts/21/mmapcause-range/core/src/eei.veryl,mmap)
    // ACLINT
    const MMAP_ACLINT_BEGIN   : Addr = 'h200_0000 as Addr;
    const MMAP_ACLINT_MSIP    : Addr = 0;
    const MMAP_ACLINT_MTIMECMP: Addr = 'h4000 as Addr;
    const MMAP_ACLINT_MTIME   : Addr = 'h7ff8 as Addr;
    const MMAP_ACLINT_SETSSIP : Addr = 'h8000 as Addr;
    const MMAP_ACLINT_END     : Addr = MMAP_ACLINT_BEGIN + 'hbfff as Addr;
#@end
//}

== ACLINTモジュールの作成

本章では、ACLINTのデバイスをaclint_memoryモジュールに実装します。
aclint_memoryモジュールは割り込みを起こすためにcsrunitモジュールと接続します。

=== インターフェースを作成する

まず、ACLINTのデバイスとcsrunitモジュールを接続するためのインターフェースを作成します。
@<code>{src/aclint_if.veryl}を作成し、次のように記述します
(@<list>{aclint_if.veryl.createaclint.mmap})。
インターフェースの中身は各デバイスの実装時に実装します。

//list[aclint_if.veryl.createaclint.mmap][aclint_if.veryl]{
#@mapfile(scripts/21/createaclint-range/core/src/aclint_if.veryl)
interface aclint_if {
    modport master {
        // TODO
    }
    modport slave {
        ..converse(master)
    }
}
#@end
//}

=== aclint_memoryモジュールを作成する

ACLINTのデバイスを実装するモジュールを作成します。
@<code>{src/aclint_memory.veryl}を作成し、次のように記述します
(@<list>{aclint_memory.veryl.createaclint.mmap})。
まだどのレジスタも実装していません。

//list[aclint_memory.veryl.createaclint.mmap][aclint_memory.veryl]{
#@mapfile(scripts/21/createaclint-range/core/src/aclint_memory.veryl)
import eei::*;

module aclint_memory (
    clk   : input   clock            ,
    rst   : input   reset            ,
    membus: modport Membus::slave    ,
    aclint: modport aclint_if::master,
) {
    assign membus.ready = 1;
    always_ff {
        if_reset {
            membus.rvalid = 0;
            membus.rdata  = 0;
        } else {
            membus.rvalid = membus.valid;
        }
    }
}
#@end
//}

=== mmio_controllerモジュールにACLINTを追加する

mmio_controllerモジュールにACLINTデバイスを追加して、
aclint_memoryモジュールにアクセスできるようにします。

@<code>{Device}型に@<code>{ACLINT}を追加して、ACLINTのデバイスをアドレスにマップします
(
@<list>{mmio_controller.veryl.createaclint.Device}、
@<list>{mmio_controller.veryl.createaclint.get_device}
)。

//list[mmio_controller.veryl.createaclint.Device][Device型にACLINTを追加する (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, Device)
    enum Device {
        UNKNOWN,
        RAM,
        ROM,
        DEBUG,
        @<b>|ACLINT,|
    }
#@end
//}

//list[mmio_controller.veryl.createaclint.get_device][get_device関数でACLINTの範囲を定義する (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, get_device)
    if MMAP_ACLINT_BEGIN <= addr && addr <= MMAP_ACLINT_END {
        return Device::ACLINT;
    }
#@end
//}

ACLINTとのインターフェースを追加し、
reset_all_device_masters関数にインターフェースをリセットするコードを追加します
(
@<list>{mmio_controller.veryl.createaclint.port}、
@<list>{mmio_controller.veryl.createaclint.reset_all}
)。

//list[mmio_controller.veryl.createaclint.port][ポートにACLINTのインターフェースを追加する (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, port)
module mmio_controller (
    clk          : input   clock         ,
    rst          : input   reset         ,
    DBG_ADDR     : input   Addr          ,
    req_core     : modport Membus::slave ,
    ram_membus   : modport Membus::master,
    rom_membus   : modport Membus::master,
    dbg_membus   : modport Membus::master,
    @<b>|aclint_membus: modport Membus::master,|
) {
#@end
//}

//list[mmio_controller.veryl.createaclint.reset_all][インターフェースの要求部分をリセットする (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, reset_all)
    function reset_all_device_masters () {
        reset_membus_master(ram_membus);
        reset_membus_master(rom_membus);
        reset_membus_master(dbg_membus);
        @<b>|reset_membus_master(aclint_membus);|
    }
#@end
//}

@<code>{ready}、@<code>{rvalid}を取得する関数にACLINTを登録します
(
@<list>{mmio_controller.veryl.createaclint.get_device_ready}、
@<list>{mmio_controller.veryl.createaclint.get_device_rvalid}
)。

//list[mmio_controller.veryl.createaclint.get_device_ready][get_device_ready関数にACLINTのreadyを追加 (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, get_device_ready)
    Device::ACLINT: return aclint_membus.ready;
#@end
//}

//list[mmio_controller.veryl.createaclint.get_device_rvalid][get_device_rvalid関数にACLINTのrvalidを追加 (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, get_device_rvalid)
    Device::ACLINT: return aclint_membus.rvalid;
#@end
//}

ACLINTの@<code>{rvalid}、@<code>{rdata}を@<code>{req_core}に割り当てます
(
@<list>{mmio_controller.veryl.createaclint.assign_device_slave}
)。

//list[mmio_controller.veryl.createaclint.assign_device_slave][ACLINTへのアクセス結果をreqに割り当てる (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, assign_device_slave)
    Device::ACLINT: req <> aclint_membus;
#@end
//}

ACLINTのインターフェースに要求を割り当てます
(
@<list>{mmio_controller.veryl.createaclint.assign_device_master}
)。

//list[mmio_controller.veryl.createaclint.assign_device_master][ACLINTにreqを割り当ててアクセス要求する (mmio_controller.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/mmio_controller.veryl, assign_device_master)
    Device::ACLINT: {
        aclint_membus      <> req;
        aclint_membus.addr -= MMAP_ACLINT_BEGIN;
    }
#@end
//}

=== ACLINTとmmio_controller、csrunitモジュールを接続する

aclint_ifインターフェース(@<code>{aclint_core_bus})、
aclint_memoryモジュールとmmio_controllerモジュールを接続するインターフェース(@<code>{aclint_membus})をインスタンス化します
(
@<list>{top.veryl.createaclint.aclint_core_bus}、
@<list>{top.veryl.createaclint.aclint_membus}
)。

//list[top.veryl.createaclint.aclint_core_bus][aclint_ifインターフェースのインスタンス化 (top.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/top.veryl,aclint_core_bus)
    inst aclint_core_bus: aclint_if;
#@end
//}

//list[top.veryl.createaclint.aclint_membus][mmio_controllerモジュールと接続するインターフェースのインスタンス化 (top.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/top.veryl,aclint_membus)
    inst aclint_membus  : Membus;
#@end
//}

aclint_memoryモジュールをインスタンス化し、
mmio_controllerモジュールと接続します
(
@<list>{top.veryl.createaclint.inst}、
@<list>{top.veryl.createaclint.mmioc}
)。

//list[top.veryl.createaclint.inst][aclint_memoryモジュールをインスタンス化する (top.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/top.veryl,inst)
    inst aclintm: aclint_memory (
        clk                    ,
        rst                    ,
        membus: aclint_membus  ,
        aclint: aclint_core_bus,
    );
#@end
//}

//list[top.veryl.createaclint.mmioc][mmio_controllerモジュールと接続する (top.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/top.veryl,mmioc)
    inst mmioc: mmio_controller (
        clk                           ,
        rst                           ,
        DBG_ADDR     : MMAP_DBG_ADDR  ,
        req_core     : mmio_membus    ,
        ram_membus   : mmio_ram_membus,
        rom_membus   : mmio_rom_membus,
        dbg_membus                    ,
        @<b>|aclint_membus                 ,|
    );
#@end
//}

core、csrunitモジュールにaclint_ifポートを追加し、
csrunitモジュールとaclint_memoryモジュールを接続します
(
@<list>{core.veryl.createaclint.port}、
@<list>{top.veryl.createaclint.core}、
@<list>{csrunit.veryl.createaclint.port}、
@<list>{core.veryl.createaclint.csru}
)。

//list[core.veryl.createaclint.port][coreモジュールにACLINTのデバイスとのインターフェースを追加する (core.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/core.veryl,port)
module core (
    clk     : input   clock               ,
    rst     : input   reset               ,
    i_membus: modport core_inst_if::master,
    d_membus: modport core_data_if::master,
    led     : output  UIntX               ,
    @<b>|aclint  : modport aclint_if::slave    ,|
) {
#@end
//}

//list[top.veryl.createaclint.core][coreモジュールにaclint_ifインターフェースを接続する (top.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/top.veryl,core)
    inst c: core (
        clk                      ,
        rst                      ,
        i_membus: i_membus_core  ,
        d_membus: d_membus_core  ,
        led                      ,
        @<b>|aclint  : aclint_core_bus,|
    );
#@end
//}

//list[csrunit.veryl.createaclint.port][csrunitモジュールACLINTデバイスとのインターフェースを追加する (csrunit.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/csrunit.veryl,port)
    minstret   : input   UInt64              ,
    led        : output  UIntX               ,
    @<b>|aclint     : modport aclint_if::slave    ,|
) {
#@end
//}

//list[core.veryl.createaclint.csru][csrunitモジュールのインスタンスにインターフェースを接続する (core.veryl)]{
#@maprange(scripts/21/createaclint-range/core/src/core.veryl,csru)
        minstret                          ,
        led                               ,
        @<b>|aclint                            ,|
    );
#@end
//}

== ソフトウェア割り込みの実装 (MSWI)

MSWIデバイスはソフトウェア割り込み(machine software interrupt)を提供するためのデバイスです。
MSWIデバイスにはハードウェアスレッド毎に4バイトのMSIPレジスタが用意されています(@<table>{mswi.map.reg})。
MSIPレジスタの上位31ビットは読み込み専用の@<code>{0}であり、最下位ビットのみ変更できます。
各MSIPレジスタは、それに対応するハードウェアスレッドのmip.MSIPと接続されています。

//table[mswi.map.reg][MSWIデバイスのメモリマップ]{
オフセット		レジスタ
-------------------------------------------------------------
0000			MSIP0
0004			MSIP1
0008			MSIP2
...				...
3ff8			MSIP4094
3ffc			予約済み
//}

仕様上はmhartidとMSIPの後ろの数字(hartID)が一致する必要はありませんが、
本書ではmhartidとhartIDが同じになるように実装します。
他のACLINTのデバイスも同様に実装します。

=== MSIPレジスタを実装する

//image[msip][MSIPレジスタ][width=90%]

ACLINTモジュールにMSIPレジスタを実装します(@<img>{msip})。
今のところCPUにはmhartidが@<code>{0}のハードウェアスレッドしか存在しないため、MSIP0のみ実装します。

aclint_ifインターフェースに@<code>{msip}を追加します
(@<list>{aclint_if.veryl.msip})。

//list[aclint_if.veryl.msip][mispビットをインターフェースに追加する (aclint_if.veryl)]{
#@mapfile(scripts/21/msip-range/core/src/aclint_if.veryl)
interface aclint_if {
    @<b>|var msip: logic;|
    modport master {
        @<b>|msip: output,|
    }
    modport slave {
        ..converse(master)
    }
}
#@end
//}

aclint_memoryモジュールに@<code>{msip0}レジスタを作成し、読み書きできるようにします
(
@<list>{aclint_memory.veryl.msip.reg}、
@<list>{aclint_memory.veryl.msip.if_reset}、
@<list>{aclint_memory.veryl.msip.rw}
)。

//list[aclint_memory.veryl.msip.reg][msip0レジスタの定義 (aclint_memory.veryl)]{
#@maprange(scripts/21/msip-range/core/src/aclint_memory.veryl,reg)
var msip0: logic;
#@end
//}

//list[aclint_memory.veryl.msip.if_reset][msip0レジスタを0でリセットする (aclint_memory.veryl)]{
#@maprange(scripts/21/msip-range/core/src/aclint_memory.veryl,if_reset)
always_ff {
    if_reset {
        membus.rvalid = 0;
        membus.rdata  = 0;
        @<b>|msip0         = 0;|
#@end
//}

//list[aclint_memory.veryl.msip.rw][msip0レジスタの書き込み、読み込み (aclint_memory.veryl)]{
#@maprange(scripts/21/msip-range/core/src/aclint_memory.veryl,rw)
if membus.valid {
    let addr: Addr = {membus.addr[XLEN - 1:3], 3'b0};
    if membus.wen {
        let M: logic<MEMBUS_DATA_WIDTH> = membus.wmask_expand();
        let D: logic<MEMBUS_DATA_WIDTH> = membus.wdata & M;
        case addr {
            MMAP_ACLINT_MSIP: msip0 = D[0] | msip0 & ~M[0];
            default         : {}
        }
    } else {
        membus.rdata = case addr {
            MMAP_ACLINT_MSIP: {63'b0, msip0},
            default         : 0,
        };
    }
}
#@end
//}

@<code>{msip0}レジスタとインターフェースの@<code>{msip}を接続します
(
@<list>{aclint_memory.veryl.msip.aclint_msip}
)。

//list[aclint_memory.veryl.msip.aclint_msip][インターフェースのmsipとmsip0レジスタを接続する (aclint_memory.veryl)]{
#@maprange(scripts/21/msip-range/core/src/aclint_memory.veryl,aclint_msip)
always_comb {
    aclint.msip = msip0;
}
#@end
//}

=== mip、mieレジスタを実装する

//image[mip][mipレジスタ][width=90%]
//image[mie][mieレジスタ][width=90%]

mipレジスタのMSIPビット、mieレジスタのMSIEビットを実装します。
mie.MSIEはMSIPビットによる割り込み待機を許可するかを制御するビットです。
mip.MSIPとmie.MSIEは同じ位置のビットに配置されています。
mip.MSIPに書き込むことはできません。

csrunitモジュールにmieレジスタを作成します
(
@<list>{csrunit.veryl.miemip.regmie}、
@<list>{csrunit.veryl.miemip.if_reset}
)。

//list[csrunit.veryl.miemip.regmie][mieレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,regmie)
    var mie     : UIntX ;
#@end
//}

//list[csrunit.veryl.miemip.if_reset][mieレジスタを0でリセットする (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,if_reset)
if_reset {
    mode     = PrivMode::M;
    mstatus  = 0;
    mtvec    = 0;
    @<b>|mie      = 0;|
    mscratch = 0;
#@end
//}

mipレジスタを作成します。
MSIPビットをMSWIデバイスのMSIP0レジスタと接続し、
それ以外のビットは@<code>{0}に設定します
(@<list>{csrunit.veryl.miemip.mip})。

//list[csrunit.veryl.miemip.mip][mipレジスタの定義 (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,mip)
    let mip: UIntX = {
        1'b0 repeat XLEN - 12, // 0
        1'b0, // MEIP
        1'b0, // 0
        1'b0, // SEIP
        1'b0, // 0
        1'b0, // MTIP
        1'b0, // 0
        1'b0, // STIP
        1'b0, // 0
        aclint.msip, // MSIP
        1'b0, // 0
        1'b0, // SSIP
        1'b0, // 0
    };
#@end
//}

mie、mipレジスタの値を読み込めるようにします
(@<list>{csrunit.veryl.miemip.rdata})。

//list[csrunit.veryl.miemip.rdata][rdataにmip、mieレジスタの値を割り当てる (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,rdata)
CsrAddr::MTVEC   : mtvec,
@<b>|CsrAddr::MIP     : mip,|
@<b>|CsrAddr::MIE     : mie,|
CsrAddr::MCYCLE  : mcycle,
#@end
//}

mieレジスタの書き込みマスクを設定して、MSIEビットを書き込めるようにします
(
@<list>{csrunit.veryl.miemip.WMASK}、
@<list>{csrunit.veryl.miemip.wmask}、
@<list>{csrunit.veryl.miemip.write}
)。
あとでMTIMEデバイスを実装するときにMTIEビットを使うため、
ここでMTIEビットも書き込めるようにしておきます。

#@# FIXME 別でMTIEの書き込みマスクを変更するステップを入れたい

//list[csrunit.veryl.miemip.WMASK][mieレジスタの書き込みマスクの定義 (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,WMASK)
    const MIE_WMASK     : UIntX = 'h0000_0000_0000_0088 as UIntX;
#@end
//}

//list[csrunit.veryl.miemip.wmask][wmaskに書き込みマスクを設定する (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,wmask)
CsrAddr::MTVEC   : MTVEC_WMASK,
@<b>|CsrAddr::MIE     : MIE_WMASK,|
CsrAddr::MSCRATCH: MSCRATCH_WMASK,
#@end
//}

//list[csrunit.veryl.miemip.write][mieレジスタの書き込み (csrunit.veryl)]{
#@maprange(scripts/21/miemip-range/core/src/csrunit.veryl,write)
if is_wsc {
    case csr_addr {
        CsrAddr::MSTATUS : mstatus  = wdata;
        CsrAddr::MTVEC   : mtvec    = wdata;
        @<b>|CsrAddr::MIE     : mie      = wdata;|
        CsrAddr::MSCRATCH: mscratch = wdata;
#@end
//}

=== mstatusのMIE、MPIEビットを実装する

mstatus.MIE、MPIEを変更できるようにします
(
@<list>{csrunit.veryl.mstatuswmask.WMASK}、
@<list>{csrunit.veryl.mstatuswmask.mstatus}
)。

//list[csrunit.veryl.mstatuswmask.WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/21/mstatuswmask-range/core/src/csrunit.veryl,WMASK)
    const MSTATUS_WMASK : UIntX = 'h0000_0000_0000_0088 as UIntX;
#@end
//}

//list[csrunit.veryl.mstatuswmask.mstatus][レジスタの場所を変数に割り当てる (csrunit.veryl)]{
#@maprange(scripts/21/mstatuswmask-range/core/src/csrunit.veryl,mstatus)
    // mstatus bits
    let mstatus_mpie: logic = mstatus[7];
    let mstatus_mie : logic = mstatus[3];
#@end
//}

トラップが発生するとき、mstatus.MPIEにmstatus.MIE、mstatus.MIEに@<code>{0}を設定します
(
@<list>{csrunit.veryl.mstatuswmask.change}
)。
また、MRET命令でmstatus.MIEにmstatus.MPIE、mstatus.MPIEに@<code>{0}を設定します。

//list[csrunit.veryl.mstatuswmask.change][トラップ、MRET命令の動作の実装 (csrunit.veryl)]{
#@maprange(scripts/21/mstatuswmask-range/core/src/csrunit.veryl,change)
if raise_trap {
    if raise_expt {
        mepc   = pc;
        mcause = trap_cause;
        mtval  = expt_value;
        @<b>|// save mstatus.mie to mstatus.mpie|
        @<b>|// and set mstatus.mie = 0|
        @<b>|mstatus[7] = mstatus[3];|
        @<b>|mstatus[3] = 0;|
    } @<b>|else if trap_return {|
        @<b>|// set mstatus.mie = mstatus.mpie|
        @<b>|//     mstatus.mpie = 0|
        @<b>|mstatus[3] = mstatus[7];|
        @<b>|mstatus[7] = 0;|
    @<b>|}|
#@end
//}

これによりトラップで割り込みを無効化して、
トラップから戻るときにmstatus.MIEを元に戻す、
という動作が実現されます。

=== 割り込み処理の実装

必要なレジスタを実装できたので、割り込みを起こす処理を実装します。
割り込みはmip、mieの両方のビット、mstatus.MIEビットが立っているときに発生します。

==== 割り込みのタイミング

割り込みでトラップを発生させるとき、
トラップが発生した時点の命令のアドレスが必要なため、
csrunitモジュールに有効な命令が供給されている必要があります。

割り込みが発生したときにcsrunitモジュールに供給されていた命令は実行されません。
ここで、割り込みを起こすタイミングに注意が必要です。
今のところ、CSRの処理はMEMステージと同時に行っているため、
例えばストア命令をmemunitモジュールで実行している途中に割り込みを発生させてしまうと、
ストア命令の結果がメモリに反映されるにもかかわらず、
mepcレジスタにストア命令のアドレスを書き込んでしまいます。

それならば、単純に次の命令のアドレスをmepcレジスタに格納するようにすればいいと思うかもしれませんが、
そもそも実行中のストア命令が本来は最終的に例外を発生させるものかもしれません。

本章ではこの問題に対処するために、
割り込みはMEM(CSR)ステージに新しく命令が供給されたクロックでしか起こせなくして、
トラップが発生するならばmemunitモジュールを無効化します。

割り込みを発生させられるかを示すフラグ(@<code>{can_intr})をcsrunitモジュールに定義し、
@<code>{mems_is_new}フラグを割り当てます
(
@<list>{csrunit.veryl.intr.port}、
@<list>{core.veryl.intr.csru}
)。

//list[csrunit.veryl.intr.port][csrunitモジュールにcan_intrを追加する (csrunit.veryl)]{
#@maprange(scripts/21/intr-range/core/src/csrunit.veryl,port)
    rs1_data   : input   UIntX               ,
    @<b>|can_intr   : input   logic               ,|
    rdata      : output  UIntX               ,
#@end
//}

//list[core.veryl.intr.csru][mem_is_newをcan_intrに割り当てる (core.veryl)]{
#@maprange(scripts/21/intr-range/core/src/core.veryl,csru)
    rs1_data   : memq_rdata.rs1_data  ,
    @<b>|can_intr   : mems_is_new          ,|
    rdata      : csru_rdata           ,
#@end
//}

トラップが発生するときにmemunitモジュールを無効にします
(
@<list>{core.veryl.intr.memu}
)。
今まではEXステージまでに例外が発生することが分かっていたら無効にしていましたが、
csrunitモジュールからトラップが発生するかどうかの情報を直接得るようにします。

//list[core.veryl.intr.memu][validの条件を変更する (core.veryl)]{
#@maprange(scripts/21/intr-range/core/src/core.veryl,memu)
    inst memu: memunit (
        clk                                   ,
        rst                                   ,
        valid : mems_valid && !@<b>|csru_raise_trap|,
#@end
//}

memunitモジュールが無効(@<code>{!valid})なとき、
@<code>{state}を@<code>{State::Init}にリセットします
(@<list>{memunit.veryl.intr.reset})。

//list[memunit.veryl.intr.reset][validではないとき、stateをInitにリセットする (core.veryl)]{
#@maprange(scripts/21/intr-range/core/src/memunit.veryl,reset)
    } else {
        if @<b>|!|valid {
            @<b>|state = State::Init;|
        @<b>|} else {|
            case state {
                State::Init: if is_new & inst_is_memop(ctrl) {
#@end
//}

==== 割り込みの判定

割り込みを起こすかどうか(@<code>{raise_intrrupt})、
割り込みのcause(@<code>{intrrupt_cause})、
トラップベクタ(@<code>{interrupt_vector})を示す変数を作成します
(@<list>{csrunit.veryl.intr.intr})。

//list[csrunit.veryl.intr.intr][割り込みを判定する (csrunit.veryl)]{
#@maprange(scripts/21/intr-range/core/src/csrunit.veryl,intr)
    // Interrupt
    let raise_interrupt : logic = valid && can_intr && mstatus_mie && (mip & mie) != 0;
    let interrupt_cause : UIntX = CsrCause::MACHINE_SOFTWARE_INTERRUPT;
    let interrupt_vector: Addr  = mtvec;
#@end
//}

トラップ情報の変数に、割り込みの情報を割り当てます
(@<list>{csrunit.veryl.intr.trap})。
本書では例外を優先します。

//list[csrunit.veryl.intr.trap][トラップを制御する変数に割り込みの値を割り当てる (csrunit.veryl)]{
#@maprange(scripts/21/intr-range/core/src/csrunit.veryl,trap)
    assign raise_trap = raise_expt || @<b>{raise_interrupt ||} trap_return;
    let trap_cause: UIntX = @<b>|switch {|
    @<b>|    raise_expt     : expt_cause,|
    @<b>|    raise_interrupt: interrupt_cause,|
    @<b>|    default        : 0,|
    @<b>|};|
    assign trap_vector = @<b>|switch {|
    @<b>|    raise_expt     : mtvec,|
    @<b>|    raise_interrupt: interrupt_vector,|
    @<b>|    trap_return    : mepc,|
    @<b>|    default        : 0,|
    @<b>|};|
#@end
//}

割り込みの時にMRET命令の判定が@<code>{0}になるようにします
(@<list>{csrunit.veryl.intr.ret})。

//list[csrunit.veryl.intr.ret][割り込みが発生するとき、trap_returnを0にする (csrunit.veryl)]{
#@maprange(scripts/21/intr-range/core/src/csrunit.veryl,ret)
    // Trap Return
    assign trap_return = valid && is_mret && !raise_expt @<b>|&& !raise_interrupt|;
#@end
//}

トラップが発生するとき、
例外の場合にのみmtvalレジスタに例外に固有の情報が書き込まれます。
本書では例外を優先するので、
@<code>{raise_expt}が@<code>{1}ならmtvalレジスタに書き込むようにします
(@<list>{csrunit.veryl.intr.ff})。

//list[csrunit.veryl.intr.ff][例外が発生したときにのみmtvalレジスタに書き込む (csrunit.veryl)]{
#@maprange(scripts/21/intr-range/core/src/csrunit.veryl,ff)
    if raise_trap {
        if raise_expt @<b>{|| raise_interrupt} {
            mepc   = pc;
            mcause = trap_cause;
            @<b>|if raise_expt {|
                mtval = expt_value;
            @<b>|}|
#@end
//}

=== ソフトウェア割り込みをテストする

ソフトウェア割り込みが正しく動くことを確認します。

@<code>{test/mswi.c}を作成し、次のように記述します
(@<list>{mswi.c.mswitest})。

//list[mswi.c.mswitest][test/mswi.c]{
#@mapfile(scripts/21/mswitest/core/test/mswi.c)
#define MSIP0 ((volatile unsigned int *)0x2000000)
#define DEBUG_REG ((volatile unsigned long long*)0x40000000)
#define MIE_MSIE (1 << 3)
#define MSTATUS_MIE (1 << 3)

void interrupt_handler(void);

void w_mtvec(unsigned long long x) {
    asm volatile("csrw mtvec, %0" : : "r" (x));
}

void w_mie(unsigned long long x) {
    asm volatile("csrw mie, %0" : : "r" (x));
}

void w_mstatus(unsigned long long x) {
    asm volatile("csrw mstatus, %0" : : "r" (x));
}

void main(void) {
    w_mtvec((unsigned long long)interrupt_handler);
    w_mie(MIE_MSIE);
    w_mstatus(MSTATUS_MIE);
    *MSIP0 = 1;
    while (1) *DEBUG_REG = 3; // fail
}

void interrupt_handler(void) {
    *DEBUG_REG = 1; // success
}
#@end
//}

プログラムでは、
mtvecにinterrupt_handler関数のアドレスを書き込み、
mstatus.MIE、mie.MSIEを@<code>{1}に設定して割り込みを許可してから
MSIP0レジスタに1を書き込んでいます。

プログラムをコンパイルして実行@<fn>{howtocompile}すると、
ソフトウェア割り込みが発生することでinterrupt_handlerにジャンプし、
デバッグ用のデバイスに@<code>{1}を書き込んで終了することを確認できます。

//footnote[howtocompile][コンパイル、実行方法は@<secref>{12-impl-mmio|debugout_howto}を参考にしてください。]

== mtvecのVectoredモードの実装

//image[mtvec][mtvecレジスタ][width=90%]

mtvecレジスタにはMODEフィールドがあり、
割り込みが発生するときのジャンプ先の決定方法を制御できます(@<img>{mtvec})。

MODEがDirect(@<code>{2'b00})のとき、@<code>{mtvec.BASE << 2}のアドレスにトラップします。
Vectored(@<code>{2'b01})のとき、@<code>{(mtvec.BASE << 2) + 4 * cause}のアドレスにトラップします。
ここでcauseは割り込みのcauseのMSBを除いた値です。
例えばmachine software interruptの場合、@<code>{(mtvec.BASE << 2) + 4 * 3}がジャンプ先になります。

例外のトラップベクタは、常にMODEがDirectとして計算します。

下位1ビットに書き込めるようにすることで、
mtvec.MODEにVectoredを書き込めるようにします
(@<list>{csrunit.veryl.mtvectored.WMASK})。

//list[csrunit.veryl.mtvectored.WMASK][書き込みマスクを変更する (csrunit.veryl)]{
#@maprange(scripts/21/mtvectored-range/core/src/csrunit.veryl,WMASK)
    const MTVEC_WMASK   : UIntX = 'hffff_ffff_ffff_fff@<b>|d|;
#@end
//}

割り込みのトラップベクタをMODEとcauseに応じて変更します
(@<list>{csrunit.veryl.mtvectored.interrupt_vector})。

//list[csrunit.veryl.mtvectored.interrupt_vector][割り込みのトラップベクタを求める (csrunit.veryl)]{
#@maprange(scripts/21/mtvectored-range/core/src/csrunit.veryl,interrupt_vector)
    let interrupt_vector: Addr  = if mtvec[0] == 0 ? {mtvec[msb:2], 2'b0} : // Direct
     {mtvec[msb:2] + interrupt_cause[msb - 2:0], 2'b0}; // Vectored
#@end
//}

例外のトラップベクタを、mtvecレジスタの下位2ビットを@<code>{0}にしたアドレス(Direct)に変更します
(
@<list>{csrunit.veryl.mtvectored.expt_vector}、
@<list>{csrunit.veryl.mtvectored.trap_vector}
)。
新しく@<code>{expt_vector}を定義し、@<code>{trap_vector}に割り当てます。

//list[csrunit.veryl.mtvectored.expt_vector][例外のトラップベクタ (csrunit.veryl)]{
#@maprange(scripts/21/mtvectored-range/core/src/csrunit.veryl,expt_vector)
    let expt_vector: Addr = {mtvec[msb:2], 2'b0};
#@end
//}

//list[csrunit.veryl.mtvectored.trap_vector][expt_vectorをtrap_vectorに割り当てる (csrunit.veryl)]{
#@maprange(scripts/21/mtvectored-range/core/src/csrunit.veryl,trap_vector)
    assign trap_vector = switch {
        raise_expt     : @<b>|expt_vector|,
        raise_interrupt: interrupt_vector,
        trap_return    : mepc,
        default        : 0,
    };
#@end
//}

== タイマ割り込みの実装 (MTIMER)

=== タイマ割り込み

MTIMERデバイスは、タイマ割り込み(machine timer interrupt)を提供するためのデバイスです。
MTIMERデバイスには1つの8バイトのMTIMEレジスタ、
ハードウェアスレッド毎に8バイトのMTIMECMPレジスタが用意されています。
本書ではMTIMECMPの後ろにMTIMEを配置します(@<table>{mtimer.map.reg})。

//table[mtimer.map.reg][本書のMTIMERデバイスのメモリマップ]{
オフセット		レジスタ
-------------------------------------------------------------
0000			MTIMECMP0
0008			MTIMECMP1
...				...
7ff0			MTIMECMP4094
7ff8			MTIME
//}

MTIMEレジスタは、固定された周波数でのクロックサイクル毎にインクリメントするレジスタです。
リセット時に@<code>{0}になります。

MTIMERデバイスは、それに対応するハードウェアスレッドのmip.MTIPと接続されており、
MTIMEがMTIMECMPを上回ったときmip.MTIPを@<code>{1}にします。
これにより、指定した時間に割り込みを発生させることが可能になります。

=== MTIME、MTIMECMPレジスタを実装する

ACLINTモジュールにMTIME、MTIMECMPレジスタを実装します。
今のところmhartidが@<code>{0}のハードウェアスレッドしか存在しないため、MTIMECMP0のみ実装します。

@<code>{mtime}、@<code>{mtimecmp0}レジスタを作成し、読み書きできるようにします
(
@<list>{aclint_memory.veryl.mtime.reg}、
@<list>{aclint_memory.veryl.mtime.reset}、
@<list>{aclint_memory.veryl.mtime.rw}
)。
@<code>{mtime}レジスタはクロック毎にインクリメントします。

#@# TODO mapに戻す　できれば
//list[aclint_memory.veryl.mtime.reg][mtime、mtimecmpレジスタの定義 (aclint_memory.veryl)]{
#@# maprange(scripts/21/mtime-range/core/src/aclint_memory.veryl,reg)
    var msip0    : logic ;
    @<b>|var mtime    : UInt64;|
    @<b>|var mtimecmp0: UInt64;|
#@# end
//}

//list[aclint_memory.veryl.mtime.reset][レジスタを0でリセットする (aclint_memory.veryl)]{
#@maprange(scripts/21/mtime-range/core/src/aclint_memory.veryl,reset)
    always_ff {
        if_reset {
            membus.rvalid = 0;
            membus.rdata  = 0;
            msip0         = 0;
            @<b>|mtime         = 0;|
            @<b>|mtimecmp0     = 0;|
#@end
//}

//list[aclint_memory.veryl.mtime.rw][mtime、mtimecmpの書き込み、読み込み (aclint_memory.veryl)]{
#@maprange(scripts/21/mtime-range/core/src/aclint_memory.veryl,rw)
    if membus.wen {
        let M: logic<MEMBUS_DATA_WIDTH> = membus.wmask_expand();
        let D: logic<MEMBUS_DATA_WIDTH> = membus.wdata & M;
        case addr {
            MMAP_ACLINT_MSIP    : msip0     = D[0] | msip0 & ~M[0];
            @<b>{MMAP_ACLINT_MTIME   : mtime     = D | mtime & ~M;}
            @<b>{MMAP_ACLINT_MTIMECMP: mtimecmp0 = D | mtimecmp0 & ~M;}
            default             : {}
        }
    } else {
        membus.rdata = case addr {
            MMAP_ACLINT_MSIP    : {63'b0, msip0},
            @<b>|MMAP_ACLINT_MTIME   : mtime,|
            @<b>|MMAP_ACLINT_MTIMECMP: mtimecmp0,|
            default             : 0,
        };
    }
#@end
//}

aclint_ifインターフェースに@<code>{mtip}を作成し、タイマ割り込みが発生する条件を設定します
(
@<list>{aclint_if.veryl.mtime.mtip}、
@<list>{aclint_memory.veryl.mtime.comb}
)。

//list[aclint_if.veryl.mtime.mtip][mtipをインターフェースに追加する (aclint_if.veryl)]{
#@maprange(scripts/21/mtime-range/core/src/aclint_if.veryl,mtip)
    var msip: logic;
    @<b>|var mtip: logic;|
    modport master {
        msip: output,
        @<b>|mtip: output,|
    }
#@end
//}

//list[aclint_memory.veryl.mtime.comb][mtipにタイマ割り込みが発生する条件を設定する (aclint_memory.veryl)]{
#@maprange(scripts/21/mtime-range/core/src/aclint_memory.veryl,comb)
    always_comb {
        aclint.msip = msip0;
        @<b>|aclint.mtip = mtime >= mtimecmp0;|
    }
#@end
//}

=== mip.MTIP、割り込み原因を設定する

mipレジスタのMTIPビットにaclint_ifインターフェースの@<code>{mtip}を接続します
(@<list>{csrunit.veryl.mtime.mip})。

//list[csrunit.veryl.mtime.mip][mip.MTIPにインターフェースのmtipを割り当てる (csrunit.veryl)]{
#@maprange(scripts/21/mtime-range/core/src/csrunit.veryl,mip)
    let mip: UIntX = {
        1'b0 repeat XLEN - 12, // 0, LCOFIP
        1'b0, // MEIP
        1'b0, // 0
        1'b0, // SEIP
        1'b0, // 0
        @<b>|aclint.mtip|, // MTIP
        1'b0, // 0
        1'b0, // STIP
        1'b0, // 0
        aclint.msip, // MSIP
        1'b0, // 0
        1'b0, // SSIP
        1'b0, // 0
    };
#@end
//}

割り込み原因を優先順位に応じて設定します。
タイマ割り込みはソフトウェア割り込みよりも優先順位が低いため、
ソフトウェア割り込みの下で原因を設定します
(@<list>{csrunit.veryl.mtime.intr})。

//list[csrunit.veryl.mtime.intr][タイマ割り込みのcauseを設定する (csrunit.veryl)]{
#@maprange(scripts/21/mtime-range/core/src/csrunit.veryl,intr)
    @<b>|let interrupt_pending: UIntX = mip & mie;|
    let raise_interrupt  : logic = valid && can_intr && mstatus_mie && @<b>|interrupt_pending != 0|;
    let interrupt_cause  : @<b>|UIntX = switch {|
        @<b>|interrupt_pending[3]:| CsrCause::MACHINE_SOFTWARE_INTERRUPT@<b>|,|
        @<b>|interrupt_pending[7]: CsrCause::MACHINE_TIMER_INTERRUPT,|
        @<b>|default             : 0,|
    @<b>|}|;
    let interrupt_vector: Addr = if mtvec[0] == 0 ? {mtvec[msb:2], 2'b0} : // Direct
     {mtvec[msb:2] + interrupt_cause[msb - 2:0], 2'b0}; // Vectored
#@end
//}

=== タイマ割り込みをテストする

タイマ割り込みが正しく動くことを確認します。

@<code>{test/mtime.c}を作成し、次のように記述します
(@<list>{mtime.c.mtime})。

//list[mtime.c.mtime][test/mtime.c]{
#@mapfile(scripts/21/mtime-range/core/test/mtime.c)
#define MTIMECMP0 ((volatile unsigned int *)0x2004000)
#define MTIME     ((volatile unsigned int *)0x2007ff8)
#define DEBUG_REG ((volatile unsigned long long*)0x40000000)
#define MIE_MTIE (1 << 7)
#define MSTATUS_MIE (1 << 3)

void interrupt_handler(void);

void w_mtvec(unsigned long long x) {
    asm volatile("csrw mtvec, %0" : : "r" (x));
}

void w_mie(unsigned long long x) {
    asm volatile("csrw mie, %0" : : "r" (x));
}

void w_mstatus(unsigned long long x) {
    asm volatile("csrw mstatus, %0" : : "r" (x));
}

void main(void) {
    w_mtvec((unsigned long long)interrupt_handler);
    *MTIMECMP0 = *MTIME + 1000000; // この数値は適当に調整する
    w_mie(MIE_MTIE);
    w_mstatus(MSTATUS_MIE);
    while (1);
    *DEBUG_REG = 3; // fail
}

void interrupt_handler(void) {
    *DEBUG_REG = 1; // success
}
#@end
//}

プログラムでは、
mtvecにinterrupt_handler関数のアドレスを設定し、
mtimeに@<code>{10000000}を足した値をmtimecmp0に設定した後、
mstatus.MIE、mie.MTIEを@<code>{1}に設定して割り込みを許可しています。
タイマ割り込みが発生するまでwhile文で無限ループします。

プログラムをコンパイルして実行すると、
時間経過によってmain関数からinterrupt_handler関数にトラップしてテストが終了します。
mtimecmp0に設定する値を変えることで、
タイマ割り込みが発生するまでの時間が変わることを確認してください。

== WFI命令の実装

WFI命令は、割り込みが発生するまでCPUをストールさせる命令です。
ただし、グローバル割り込みイネーブルビットは考慮せず、
ある割り込みの待機(pending)ビットと許可(enable)ビットの両方が立っているときに実行を再開します。
また、それ以外の自由な理由で実行を再開させてもいいです。
WFI命令で割り込みが発生するとき、WFI命令の次のアドレスの命令で割り込みが起こったことになります。

本書ではWFI命令を何もしない命令として実装します。

inst_decoderモジュールでWFI命令をデコードできるようにします
(@<list>{inst_decoder.veryl.wfi.wfi})。

//list[inst_decoder.veryl.wfi.wfi][WFI命令のデコード (inst_decoder.veryl)]{
#@maprange(scripts/21/wfi-range/core/src/inst_decoder.veryl,wfi)
    OP_SYSTEM: f3 != 3'b000 && f3 != 3'b100 || // CSRR(W|S|C)[I]
     bits == 32'h00000073 || // ECALL
     bits == 32'h00100073 || // EBREAK
     bits == 32'h30200073 @<b>{||} //MRET
     @<b>{bits == 32'h10500073}, @<b>{// WFI}
    OP_MISC_MEM: T, // FENCE
#@end
//}

WFI命令で割り込みが発生するとき、mepcレジスタに@<code>{pc + 4}を書き込むようにします
(
@<list>{csrunit.veryl.wfi.is_wfi}、
@<list>{csrunit.veryl.wfi.expt}
)。

//list[csrunit.veryl.wfi.is_wfi][WFI命令の判定 (csrunit.veryl)]{
#@maprange(scripts/21/wfi-range/core/src/csrunit.veryl,is_wfi)
    let is_wfi: logic = inst_bits == 32'h10500073;
#@end
//}

//list[csrunit.veryl.wfi.expt][WFI命令のとき、mepcをpc+4にする (csrunit.veryl)]{
#@maprange(scripts/21/wfi-range/core/src/csrunit.veryl,expt)
    if raise_expt || raise_interrupt {
        mepc = @<b>|if raise_expt ? pc : // exception|
         @<b>|if raise_interrupt && is_wfi ? pc + 4 : pc; // interrupt when wfi / interrupt|
        mcause = trap_cause;
#@end
//}

== time、instret、cycleレジスタの実装

RISC-Vにはtime、instret、cycleという読み込み専用のCSRが定義されており、
それぞれmtime、minstret、mcycleレジスタと同じ値をとります@<fn>{hpmcounter}。

//footnote[hpmcounter][mhpmcounterレジスタと同じ値をとるhpmcounterレジスタもありますが、mhpmcounterレジスタを実装していないので実装しません。]

@<code>{CsrAddr}型にレジスタのアドレスを追加します
(@<list>{eei.veryl.zicntr.CsrAddr})。

//list[eei.veryl.zicntr.CsrAddr][アドレスの定義 (eei.veryl)]{
#@maprange(scripts/21/zicntr-range/core/src/eei.veryl,CsrAddr)
    // Unprivileged Counter/Timers
    CYCLE = 12'hC00,
    TIME = 12'hC01,
    INSTRET = 12'hC02,
#@end
//}

mtimeレジスタの値をACLINTモジュールからcsrunitに渡します
(
@<list>{aclint_if.veryl.zicntr.mtime}、
@<list>{aclint_memory.veryl.zicntr.comb}
)。

//list[aclint_if.veryl.zicntr.mtime][mtimeをインターフェースに追加する (aclint_if.veryl)]{
#@maprange(scripts/21/zicntr-range/core/src/aclint_if.veryl,mtime)
@<b>|import eei::*;|

interface aclint_if {
    var msip : logic ;
    var mtip : logic ;
    @<b>|var mtime: UInt64;|
    modport master {
        msip : output,
        mtip : output,
        @<b>|mtime: output,|
    }
#@end
//}

//list[aclint_memory.veryl.zicntr.comb][mtimeをインターフェースに割り当てる (aclint_memory.veryl)]{
#@maprange(scripts/21/zicntr-range/core/src/aclint_memory.veryl,comb)
    always_comb {
        aclint.msip  = msip0;
        aclint.mtip  = mtime >= mtimecmp0;
        @<b>|aclint.mtime = mtime;|
    }
#@end
//}

time、instret、cycleレジスタを読み込めるようにします
(@<list>{csrunit.veryl.zicntr.rdata})。

//list[csrunit.veryl.zicntr.rdata][rdataにインターフェースのmtimeを割り当てる (csrunit.veryl)]{
#@maprange(scripts/21/zicntr-range/core/src/csrunit.veryl,rdata)
    CsrAddr::CYCLE   : mcycle,
    CsrAddr::TIME    : aclint.mtime,
    CsrAddr::INSTRET : minstret,
#@end
//}