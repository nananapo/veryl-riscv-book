= Memory-mapped I/Oの実装

== Memory-mapped I/Oとは何か？

//image[mmio][メモリマップドIOの例][width=40%]

これまでの実装では、
CPUに内蔵された1つの大きなメモリ空間、
1つのメモリデバイス(memoryモジュール)に命令データを格納、実行し、
データのロードストア命令も同じメモリに対して実行してきました。

一般に流通するコンピュータは複数のデバイスに接続されています。
CPUが起動すると、読み込み専用の小さなメモリ(ROM)に格納されたプログラムから命令の実行を開始します。
プログラムは周辺デバイスの初期化などを行ったあと、
動かしたいアプリケーションの命令やデータをRAMに展開して、
制御をアプリケーションに移します。

CPUがデバイスにアクセスする方法にはCSRやメモリ空間を経由する方法があります。
一般的な方法はメモリ空間を通じてデバイスにアクセスする方法であり、
この方式のことを@<b>{メモリマップドIO}(Memory-mapped I/O, @<b>{MMIO})と呼びます。
メモリ空間の一部を、デバイスにアクセスするための空間として扱うことを、メモリ(またはアドレス)に@<b>{マップ}すると呼びます。
RAMとROMもメモリデバイスであり、異なるアドレスにマップされています。

本章ではCPUのメモリ部分をRAM(Random Access Memory)@<fn>{about-ram}とROM(Read Only Memory)に分割し、
アクセスするアドレスに応じてアクセスするデバイスを切り替える機能を実装します。
また、デバッグ用の入出力デバイス(64ビットのレジスタ)も追加します。
デバイスとメモリ空間の対応は図@<img>{mmio}のように設定します。
図@<img>{mmio}のようにメモリがどのように配置されているかを示す図のことを@<b>{メモリマップ}(Memory map)と呼びます。
あるメモリ空間の先頭アドレスのことをベースアドレス(base address)と呼ぶことがあります。

//footnote[about-ram][本章では実際のRAMデバイスへのアクセスを実装せずmemoryモジュールで代用します。FPGAに合成するときに実際のデバイスへのアクセスに置き換えます。]

== 定数の定義

eeiパッケージに定義しているメモリの定数をRAM用の定数に変更します。
また、新しくRAMのベースアドレス、メモリバスのデータ幅、ROMのメモリマップを示す定数を定義してください
(@<list>{eei.veryl.memtoram.const})。
デバッグ入出力デバイス(レジスタ)の位置は、topモジュールのポートで定義します
(@<list>{top.veryl.memtoram.port})。

//list[eei.veryl.memtoram.const][メモリマップの定義 (eei.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/eei.veryl,const)
    // メモリ@<b>|バス|のデータ幅
    const MEM@<b>|BUS|_DATA_WIDTH: u32 = 64;
    @<del>|// メモリのアドレス幅|
    @<del>|const MEM_ADDR_WIDTH: u32 = 16;|

    // RAM
    const RAM_ADDR_WIDTH: u32  = 16;
    const RAM_DATA_WIDTH: u32  = 64;
    const MMAP_RAM_BEGIN: Addr = 'h8000_0000 as Addr;

    // ROM
    const ROM_ADDR_WIDTH: u32  = 9;
    const ROM_DATA_WIDTH: u32  = 64;
    const MMAP_ROM_BEGIN: Addr = 'h1000 as Addr;
    const MMAP_ROM_END  : Addr = MMAP_ROM_BEGIN + 'h3ff as Addr;
#@end
//}

@<code>{MEM_DATA_WIDTH}、@<code>{MEM_ADDR_WIDTH}を使っている部分を@<code>{MEMBUS_DATA_WIDTH}、@<code>{XLEN}に置き換えます。
@<code>{MEMBUS_DATA_WIDTH}と@<code>{XLEN}を使うmembus_ifインターフェースに別名@<code>{Membus}をつけて利用します
(
@<list>{membus_if.veryl.memtoram.Membus}
@<list>{core.veryl.memtoram.port}
)。

//list[membus_if.veryl.memtoram.Membus][定数名を変更する (membus_if.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/membus_if.veryl,Membus)
alias interface Membus = membus_if::<eei::MEMBUS_DATA_WIDTH, eei::XLEN>;
#@end
//}

//list[core.veryl.memtoram.port][Membusに置き換える (core.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/core.veryl,port)
module core (
    clk     : input   clock                          ,
    rst     : input   reset                          ,
    i_membus: modport membus_if::<ILEN, XLEN>::master,
    d_membus: modport @<b>|Membus|::master                 ,
    led     : output  UIntX                          ,
) {
#@end
//}

//list[memunit.veryl.memtoram.port][Membusに置き換える (memunit.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/memunit.veryl,port)
    membus: modport @<b>|Membus|::master, // メモリとのinterface
#@end
//}

//list[memunit.veryl.memtoram.var][定数名を変更する (memunit.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/memunit.veryl,var)
    var req_wen  : logic                       ;
    var req_addr : Addr                        ;
    var req_wdata: logic<MEM@<b>|BUS|_DATA_WIDTH>    ;
    var req_wmask: logic<MEM@<b>|BUS|_DATA_WIDTH / 8>;

    const W   : u32                      = XLEN;
    let D   : logic<MEM@<b>|BUS|_DATA_WIDTH> = membus.rdata;
    let sext: logic                    = ctrl.funct3[2] == 1'b0;
#@end
//}

topモジュールでインスタンス化しているmembus_ifインターフェースのジェネリックパラメータを変更します
(@<list>{top.veryl.memtoram.membus})。

//list[top.veryl.memtoram.membus][ジェネリックパラメータを変更する / Membusに置き換える (top.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/top.veryl,membus)
    inst membus  : membus_if::<@<b>|RAM|_DATA_WIDTH, @<b>|RAM|_ADDR_WIDTH>;
    inst i_membus: membus_if::<ILEN, XLEN>; // 命令フェッチ用
    inst d_membus: @<b>|Membus|; // ロードストア命令用
#@end
//}

addr_to_memaddr関数をジェネリック関数にして、呼び出すときにRAMのパラメータを使用するように変更します
(
@<list>{top.veryl.memtoram.addr_to_memaddr}、
@<list>{top.veryl.memtoram.arb}、
)。

//list[top.veryl.memtoram.addr_to_memaddr][addr_to_memaddr関数をジェネリック関数に変更する (top.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/top.veryl,addr_to_memaddr)
    // アドレスをデータ単位でのアドレスに変換する
    function addr_to_memaddr@<b>|::<DATA_WIDTH: u32, ADDR_WIDTH: u32>| (
        addr: input logic<XLEN>,
    ) -> logic<@<b>|ADDR_WIDTH|> {
        return addr[$clog2(@<b>|DATA_WIDTH| / 8)+:@<b>|ADDR_WIDTH|];
    }
#@end
//}

//list[top.veryl.memtoram.arb][ジェネリックパラメータを指定する (top.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/top.veryl,arb)
        membus.valid = i_membus.valid | d_membus.valid;
        if d_membus.valid {
            membus.addr  = addr_to_memaddr@<b>|::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH>|(d_membus.addr);
            membus.wen   = d_membus.wen;
            membus.wdata = d_membus.wdata;
            membus.wmask = d_membus.wmask;
        } else {
            membus.addr  = addr_to_memaddr@<b>|::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH>|(i_membus.addr);
            membus.wen   = 0; // 命令フェッチは常に読み込み
            membus.wdata = 'x;
            membus.wmask = 'x;
        }
#@end
//}

メモリに読み込むHEXファイルを指定するパラメータの名前を変更します
(
@<list>{top.veryl.memtoram.port}、
@<list>{top.veryl.memtoram.inst}
)。

//list[top.veryl.memtoram.port][パラメータ名を変更する (top.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/top.veryl,port)
module top #(
    param RAM_FILEPATH_IS_ENV: bit    = 1              ,
    param RAM_FILEPATH       : string = "RAM_FILE_PATH",
) (
    clk          : input clock,
    rst          : input reset,
    MMAP_DBG_ADDR: input Addr ,
#@end
//}

//list[top.veryl.memtoram.inst][パラメータ名を変更する (top.veryl)]{
#@maprange(scripts/12/memtoram-range/core/src/top.veryl,inst)
    inst ram: memory::<@<b>|RAM|_DATA_WIDTH, @<b>|RAM|_ADDR_WIDTH> #(
        FILEPATH_IS_ENV: @<b>|RAM|_FILEPATH_IS_ENV,
        FILEPATH       : @<b>|RAM|_FILEPATH       ,
    ) (
#@end
//}

シミュレータ用のC++プログラムも変更します
(
@<list>{tb_verilator.cpp.memtoram.arg}、
@<list>{tb_verilator.cpp.memtoram.env}、
@<list>{tb_verilator.cpp.memtoram.save}
)。

//list[tb_verilator.cpp.memtoram.arg][引数の名称を変える (tb_verilator.cpp)]{
#@maprange(scripts/12/memtoram-range/core/src/tb_verilator.cpp,arg)
    if (argc < 2) {
        std::cout << "Usage: " << argv[0] << " @<b>|RAM|_FILE_PATH [CYCLE]" << std::endl;
        return 1;
    }
#@end
//}

//list[tb_verilator.cpp.memtoram.env][環境変数名を変える (tb_verilator.cpp)]{
#@maprange(scripts/12/memtoram-range/core/src/tb_verilator.cpp,env)
    // 環境変数でメモリの初期化用ファイルを指定する
    const char* original_env = getenv("@<b>|RAM|_FILE_PATH");
    setenv("@<b>|RAM|_FILE_PATH", memory_file_path.c_str(), 1);
#@end
//}

//list[tb_verilator.cpp.memtoram.save][環境変数名を変える (tb_verilator.cpp)]{
#@maprange(scripts/12/memtoram-range/core/src/tb_verilator.cpp,save)
    // 環境変数を元に戻す
    if (original_env != nullptr){
        setenv("@<b>|RAM|_FILE_PATH", original_env, 1);
    }
#@end
//}

== mmio_controllerモジュールの作成

アクセスするアドレスに応じてアクセス先のデバイスを切り替えるモジュールを実装します。

@<code>{src/mmio_controller.veryl}を作成し、次のように記述します
(
@<list>{mmio_controller.veryl.emptymmio}
)。

//list[mmio_controller.veryl.emptymmio][mmio_controller.veryl]{
#@mapfile(scripts/12/emptymmio/core/src/mmio_controller.veryl)
import eei::*;

module mmio_controller (
    clk     : input   clock        ,
    rst     : input   reset        ,
    req_core: modport Membus::slave,
) {

    enum Device {
        UNKNOWN,
    }

    inst req_saved: Membus;

    var last_device : Device;
    var is_requested: logic ;

    // masterを0でリセットする
    function reset_membus_master (
        master: modport Membus::master_output,
    ) {
        master.valid = 0;
        master.addr  = 0;
        master.wen   = 0;
        master.wdata = 0;
        master.wmask = 0;
    }

    // すべてのデバイスのmasterをリセットする
    function reset_all_device_masters () {}

    // アドレスからデバイスを取得する
    function get_device (
        addr: input Addr,
    ) -> Device {
        return Device::UNKNOWN;
    }

    // デバイスのmasterにreqの情報を割り当てる
    function assign_device_master (
        req: modport Membus::all_input,
    ) {}

    // デバイスのrvalid、rdataをreqに割り当てる
    function assign_device_slave (
        device: input   Device          ,
        req   : modport Membus::response,
    ) {
        req.rvalid = 1;
        req.rdata  = 0;
    }

    // デバイスのreadyを取得する
    function get_device_ready (
        device: input Device,
    ) -> logic {
        return 1;
    }

    // デバイスのrvalidを取得する
    function get_device_rvalid (
        device: input Device,
    ) -> logic {
        return 1;
    }

    // req_coreの割り当て
    always_comb {
        req_core.ready  = 0;
        req_core.rvalid = 0;
        req_core.rdata  = 0;

        if req_saved.valid {
            if is_requested {
                // 結果を返す
                assign_device_slave(last_device, req_core);
                req_core.ready      = get_device_rvalid(last_device);
            }
        } else {
            req_core.ready = 1;
        }
    }

    // デバイスのmasterの割り当て
    always_comb {
        reset_all_device_masters();
        if req_saved.valid {
            if is_requested {
                if get_device_rvalid(last_device) {
                    // 新しく要求を受け入れる
                    if req_core.ready && req_core.valid {
                        assign_device_master(req_core);
                    }
                }
            } else {
                // デバイスにreq_savedを割り当てる
                assign_device_master(req_saved);
            }
        } else {
            // 新しく要求を受け入れる
            if req_core.ready && req_core.valid {
                assign_device_master(req_core);
            }
        }
    }

    // 新しく要求を受け入れる
    function accept_request () {
        req_saved.valid = req_core.ready && req_core.valid;
        if req_core.ready && req_core.valid {
            last_device  = get_device(req_core.addr);
            is_requested = get_device_ready(last_device);
            // reqを保存
            req_saved.addr  = req_core.addr;
            req_saved.wen   = req_core.wen;
            req_saved.wdata = req_core.wdata;
            req_saved.wmask = req_core.wmask;
        }
    }

    function on_clock () {
        if req_saved.valid {
            if is_requested {
                if get_device_rvalid(last_device) {
                    accept_request();
                }
            } else {
                is_requested = get_device_ready(last_device);
            }
        } else {
            accept_request();
        }
    }

    function on_reset () {
        last_device         = Device::UNKNOWN;
        is_requested        = 0;
        reset_membus_master(req_saved);
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

mmio_controllerモジュールの関数の引数にmembus_ifインターフェースを使うために、
新しくmodportを宣言します
(@<list>{membus_if.veryl.emptymmio.modport})。

//list[membus_if.veryl.emptymmio.modport][modport宣言を追加する (membus_if.veryl)]{
#@maprange(scripts/12/emptymmio-range/core/src/membus_if.veryl,modport)
    modport all_input {
        ..input
    }

    modport response {
        rvalid: output,
        rdata : output,
    }

    modport slave_output {
        ready: output,
        ..same(response)
    }

    modport master_output {
        valid: output,
        addr : output,
        wen  : output,
        wdata: output,
        wmask: output,
    }
#@end
//}

mmio_controllerモジュールは@<code>{req_core}からメモリアクセス要求を受け付け、
アクセス対象のモジュールからの結果を返すモジュールです。

@<code>{Device}型は実装しているデバイスを表現するための列挙型です
(@<list>{mmio_controller.veryl.emptymmio.Device})。
まだデバイスを接続していないので、不明なデバイス(@<code>{Device::UNKNOWN})だけ定義しています。

//list[mmio_controller.veryl.emptymmio.Device][Device型の定義 (mmio_controller.veryl)]{
#@maprange(scripts/12/emptymmio-range/core/src/mmio_controller.veryl,Device)
    enum Device {
        UNKNOWN,
    }
#@end
//}

reset_membus_master、reset_all_device_masters関数はインターフェースの値の割り当てを@<code>{0}でリセットするためのユーティリティ関数です。
名前がget_device_、assign_deviceから始まる関数は、デバイスの状態を取得したり、インターフェースに値を割り当てる関数です。
get_device関数はアドレスに対応する@<code>{Device}を取得する関数です。

always_comb、always_ffブロックはこれらの関数を利用してメモリアクセスを制御します。

always_ffブロックは、メモリアクセス要求の処理中ではない場合とメモリアクセスが終わった場合にメモリアクセス要求を受け入れます。
要求を受け入れるとき、@<code>{req_core}の値を@<code>{req_saved}に保存します。

always_combブロックはデバイスにアクセスし
@<code>{req_core}に結果を返します。
@<code>{is_requested}は、メモリアクセス要求を処理している場合に既にデバイスが要求を受け入れたかを示すフラグです。
新しく要求を受け入れるときと@<code>{is_requested}が@<code>{0}のときにデバイスに要求を割り当て、
@<code>{is_requested}が@<code>{1}かつ@<code>{rvalid}が@<code>{1}のときに結果を返します。

まだアクセス先のデバイスを実装していないため、
常に@<code>{0}を読み込み、@<code>{ready}と@<code>{rvalid}は常に@<code>{1}にして、書き込みは無視します。

== RAMの接続

=== mmio_controllerモジュールにRAMを追加する

mmio_controllerモジュールにRAMとのインターフェースを実装します。

@<code>{Device}型にRAMを追加して、アドレスにRAMをマップします
(@<list>{mmio_controller.veryl.ram.Device}、
@<list>{mmio_controller.veryl.ram.get_device}
)。

//list[mmio_controller.veryl.ram.Device][Device型にRAMを追加する (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,Device)
    enum Device {
        UNKNOWN,
        RAM,
    }
#@end
//}

//list[mmio_controller.veryl.ram.get_device][get_device関数でRAMの範囲を定義する (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,get_device)
    function get_device (
        addr: input Addr,
    ) -> Device {
        @<b>|if addr >= MMAP_RAM_BEGIN {|
        @<b>|    return Device::RAM;|
        @<b>|}|
        return Device::UNKNOWN;
    }
#@end
//}

RAMとのインターフェースを追加し、
reset_all_device_masters関数に要求をリセットするコードを追加します
(
@<list>{mmio_controller.veryl.ram.port}、
@<list>{mmio_controller.veryl.ram.reset_all}
)。

//list[mmio_controller.veryl.ram.port][RAMとのインターフェースを追加する (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,port)
module mmio_controller (
    clk       : input   clock         ,
    rst       : input   reset         ,
    req_core  : modport Membus::slave ,
    @<b>|ram_membus: modport Membus::master,|
) {
#@end
//}

//list[mmio_controller.veryl.ram.reset_all][インターフェースの要求部分をリセットする (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,reset_all)
    function reset_all_device_masters () {
        @<b>|reset_membus_master(ram_membus);|
    }
#@end
//}

@<code>{ready}、@<code>{rvalid}を取得する関数にRAMを登録します
(
@<list>{mmio_controller.veryl.ram.get_device_ready}、
@<list>{mmio_controller.veryl.ram.get_device_rvalid}
)。

//list[mmio_controller.veryl.ram.get_device_ready][インターフェースのreadyを返す (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,get_device_ready)
    function get_device_ready (
        device: input Device,
    ) -> logic {
        @<b>|case device {|
        @<b>|    Device::RAM: return ram_membus.ready;|
        @<b>|    default    : {}|
        @<b>|}|
        return 1;
    }
#@end
//}

//list[mmio_controller.veryl.ram.get_device_rvalid][インターフェースのrvalidを返す (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,get_device_rvalid)
    function get_device_rvalid (
        device: input Device,
    ) -> logic {
        @<b>|case device {|
        @<b>|    Device::RAM: return ram_membus.rvalid;|
        @<b>|    default    : {}|
        @<b>|}|
        return 1;
    }
#@end
//}

RAMの@<code>{rvalid}、@<code>{rdata}を@<code>{req_core}に割り当てます
(@<list>{mmio_controller.veryl.ram.assign_device_slave})。

//list[mmio_controller.veryl.ram.assign_device_slave][RAMへのアクセス結果をreqに割り当てる (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,assign_device_slave)
    function assign_device_slave (
        device: input   Device          ,
        req   : modport Membus::response,
    ) {
        req.rvalid = 1;
        req.rdata  = 0;
        @<b>|case device {|
        @<b>|    Device::RAM: req <> ram_membus;|
        @<b>|    default    : {}|
        @<b>|}|
    }
#@end
//}

RAMのインターフェースに要求を割り当てます
(@<list>{mmio_controller.veryl.ram.assign_device_master})。
ここでRAMのベースアドレスを引いたアドレスを割り当てることで、@<code>{MMAP_RAM_BEGIN}が@<code>{0}になるようにしています。

//list[mmio_controller.veryl.ram.assign_device_master][RAMにreqを割り当ててアクセス要求する (mmio_controller.veryl)]{
#@maprange(scripts/12/ram-range/core/src/mmio_controller.veryl,assign_device_master)
    function assign_device_master (
        req: modport Membus::all_input,
    ) {
        @<b>|case get_device(req.addr) {|
        @<b>|    Device::RAM: {|
        @<b>|        ram_membus      <> req;|
        @<b>|        ram_membus.addr -= MMAP_RAM_BEGIN;|
        @<b>|    }|
        @<b>|    default: {}|
        @<b>|}|
    }
#@end
//}

=== RAMとmmio_controllerモジュールを接続する

topモジュールにmmio_controllerモジュールをインスタンス化し、
RAMとmmio_controllerモジュール、mmio_controllerモジュールとcoreモジュールを接続します。

RAMとmmio_controllerモジュールを接続するインターフェース(@<code>{mmio_ram_membus})、
coreモジュールとmmio_controllerモジュールを接続するインターフェース(@<code>{mmio_membus})を定義し、
@<code>{membus}を@<code>{ram_membus}に改名します
(
@<list>{top.veryl.ram.interface}、
@<list>{top.veryl.ram.ram}
)。

//list[top.veryl.ram.interface][インターフェースの定義 / インスタンス名を変更する (top.veryl)]{
#@maprange(scripts/12/ram-range/core/src/top.veryl,interface)
    @<b>|inst mmio_membus    : Membus;|
    @<b>|inst mmio_ram_membus: Membus;|
    inst @<b>|ram_|membus     : membus_if::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH>;
#@end
//}

//list[top.veryl.ram.ram][ポート名を変更する (top.veryl)]{
#@maprange(scripts/12/ram-range/core/src/top.veryl,ram)
    inst ram: memory::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH> #(
        FILEPATH_IS_ENV: RAM_FILEPATH_IS_ENV,
        FILEPATH       : RAM_FILEPATH       ,
    ) (
        clk               ,
        rst               ,
        @<b>|membus:| @<b>|ram_|membus,
    );
#@end
//}

coreモジュールからRAMへのメモリアクセスを調停する処理を、
coreモジュールからmmio_controllerモジュールへのアクセスを調停する処理に変更します
(@<list>{top.veryl.ram.arb})。

//list[top.veryl.ram.arb][調停する対象をmmio_membusに変更する (top.veryl)]{
#@maprange(scripts/12/ram-range/core/src/top.veryl,arb)
    // @<b>|mmio_controller|へのメモリアクセスを調停する
    always_ff {
        if_reset {
            memarb_last_i     = 0;
            memarb_last_iaddr = 0;
        } else {
            if @<b>|mmio_|membus.ready {
                memarb_last_i     = !d_membus.valid;
                memarb_last_iaddr = i_membus.addr;
            }
        }
    }

    always_comb {
        i_membus.ready  = @<b>|mmio_|membus.ready && !d_membus.valid;
        i_membus.rvalid = @<b>|mmio_|membus.rvalid && memarb_last_i;
        i_membus.rdata  = if memarb_last_iaddr[2] == 0 ? @<b>|mmio_|membus.rdata[31:0] : mmio_|membus.rdata[63:32];

        d_membus.ready  = @<b>|mmio_|membus.ready;
        d_membus.rvalid = @<b>|mmio_|membus.rvalid && !memarb_last_i;
        d_membus.rdata  = @<b>|mmio_|membus.rdata;

        @<b>|mmio_|membus.valid = i_membus.valid | d_membus.valid;
        if d_membus.valid {
            @<b>|mmio_|membus.addr  = @<b>|d_membus.addr|;
            @<b>|mmio_|membus.wen   = d_membus.wen;
            @<b>|mmio_|membus.wdata = d_membus.wdata;
            @<b>|mmio_|membus.wmask = d_membus.wmask;
        } else {
            @<b>|mmio_|membus.addr  = @<b>|i_membus.addr|;
            @<b>|mmio_|membus.wen   = 0; // 命令フェッチは常に読み込み
            @<b>|mmio_|membus.wdata = 'x;
            @<b>|mmio_|membus.wmask = 'x;
        }
    }
#@end
//}

mmio_controllerをインスタンス化し、RAMと接続します。
(
@<list>{top.veryl.ram.inst}、
@<list>{top.veryl.ram.connect}
)。
RAMのアドレスへの変換は調停処理から接続部分に移動しています。

//list[top.veryl.ram.inst][mmio_controllerモジュールをインスタンス化する (top.veryl)]{
#@maprange(scripts/12/ram-range/core/src/top.veryl,inst)
    inst mmioc: mmio_controller (
        clk                        ,
        rst                        ,
        req_core  : mmio_membus    ,
        ram_membus: mmio_ram_membus,
    );
#@end
//}

//list[top.veryl.ram.connect][mmio_controllerモジュールとRAMを接続する (top.veryl)]{
#@maprange(scripts/12/ram-range/core/src/top.veryl,connect)
    always_comb {
        // mmio <> RAM
        ram_membus.valid       = mmio_ram_membus.valid;
        mmio_ram_membus.ready  = ram_membus.ready;
        ram_membus.addr        = addr_to_memaddr::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH>(mmio_ram_membus.addr);
        ram_membus.wen         = mmio_ram_membus.wen;
        ram_membus.wdata       = mmio_ram_membus.wdata;
        ram_membus.wmask       = mmio_ram_membus.wmask;
        mmio_ram_membus.rvalid = ram_membus.rvalid;
        mmio_ram_membus.rdata  = ram_membus.rdata;
    }
#@end
//}

==={changepc} PCの初期値の変更

PCの初期値を@<code>{MMAP_RAM_BEGIN}にすることで、RAMのベースアドレスからプログラムの実行を開始するように変更します。
eeiパッケージに@<code>{INITIAL_PC}を定義し、PCのリセット時に利用します
(
@<list>{eei.veryl.ram.pc}、
@<list>{core.veryl.ram.pc}
)。

//list[eei.veryl.ram.pc][PCの初期値を定義する (eei.veryl)]{
#@maprange(scripts/12/ram-range/core/src/eei.veryl,pc)
    // pc on reset
    const INITIAL_PC: Addr = MMAP_RAM_BEGIN;
#@end
//}

//list[core.veryl.ram.pc][PCの初期値を設定する (core.veryl)]{
#@maprange(scripts/12/ram-range/core/src/core.veryl,pc)
    always_ff {
        if_reset {
            if_pc           = @<b>|INITIAL_PC|;
            if_is_requested = 0;
            if_pc_requested = 0;
            if_fifo_wvalid  = 0;
            if_fifo_wdata   = 0;
        } else {
#@end
//}

riscv-testsを実行してRAMにアクセスできているか確認します。
今のところriscv-testsはアドレス@<code>{0}から配置されるようにリンクしているため、
riscv-testsの@<code>{env/p/link.ld}を変更します
(@<list>{link.ld.ram.riscv-tests})。

//list[link.ld.ram.riscv-tests][プログラムの先頭のアドレスを変更する (riscv-tests/env/p/link.ld)]{
OUTPUT_ARCH( "riscv" )
ENTRY(_start)

SECTIONS
{
  . = @<b>|0x00000000|; @<balloon>{先頭を0x80000000に変更する (戻す)}
//}

riscv-testsをビルドしなおし、成果物をtestディレクトリに配置してください。
ビルドしなおしたので、HEXファイルを再度生成します
(@<list>{terminal.ram.recompile})。

//terminal[terminal.ram.recompile][]{
$ @<userinput>{cd test}
$ @<userinput>{find share/ -type f -not -name "*.dump" -exec riscv64-unknown-elf-objcopy -O binary {} {}.bin \;}
$ @<userinput>{find share/ -type f -name "*.bin" -exec sh -c "python3 bin2hex.py 8 {} > {}.hex" \;}
//}

riscv-testsの終了判定用のアドレスを@<code>{MMAP_RAM_BEGIN}基準のアドレスに変更します
(@<list>{top.veryl.ram.riscvtests})。

//list[top.veryl.ram.riscvtests][.tohostのアドレスを変更する (top.veryl)]{
#@maprange(scripts/12/ram-range/core/src/top.veryl,riscvtests)
    #[ifdef(TEST_MODE)]
    always_ff {
        let RISCVTESTS_TOHOST_ADDR: Addr = @<b>|MMAP_RAM_BEGIN +| 'h1000 as Addr;
        if d_membus.valid && d_membus.ready && d_membus.wen == 1 && d_membus.addr == RISCVTESTS_TOHOST_ADDR && d_membus.wdata[lsb] == 1'b1 {
            test_success = d_membus.wdata == 1;
            if d_membus.wdata == 1 {
                $display("riscv-tests success!");
            } else {
                $display("riscv-tests failed!");
                $error  ("wdata : %h", d_membus.wdata);
            }
            $finish();
        }
    }
#@end
//}

riscv-testsを実行し、RAMにアクセスできてテストに成功することを確認してください。

== ROMの実装

=== mmio_controllerモジュールにROMを追加する

mmio_controllerモジュールにROMとのインターフェースを実装します。

@<code>{Device}型にROMを追加して、アドレスにROMをマップします
(
@<list>{mmio_controller.veryl.rom.Device}、
@<list>{mmio_controller.veryl.rom.get_device}
)。

//list[mmio_controller.veryl.rom.Device][Device型にROMを変更する (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,Device)
    enum Device {
        UNKNOWN,
        RAM,
        @<b>|ROM,|
    }
#@end
//}

//list[mmio_controller.veryl.rom.get_device][get_device関数でROMの範囲を定義する (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,get_device)
    function get_device (
        addr: input Addr,
    ) -> Device {
        @<b>|if MMAP_ROM_BEGIN <= addr && addr <= MMAP_ROM_END {|
        @<b>|    return Device::ROM;|
        @<b>|}|
        if addr >= MMAP_RAM_BEGIN {
            return Device::RAM;
        }
        return Device::UNKNOWN;
    }
#@end
//}

ROMとのインターフェースを追加します
(
@<list>{mmio_controller.veryl.rom.port}、
@<list>{mmio_controller.veryl.rom.reset_all}
)。
reset_all_device_masters関数でインターフェースをリセットします。

//list[mmio_controller.veryl.rom.port][ROMとのインターフェースを追加する (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,port)
module mmio_controller (
    clk       : input   clock         ,
    rst       : input   reset         ,
    req_core  : modport Membus::slave ,
    ram_membus: modport Membus::master,
    @<b>|rom_membus: modport Membus::master,|
) {
#@end
//}

//list[mmio_controller.veryl.rom.reset_all][インターフェースの要求部分をリセットする (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,reset_all)
    function reset_all_device_masters () {
        reset_membus_master(ram_membus);
        @<b>|reset_membus_master(rom_membus);|
    }
#@end
//}

@<code>{ready}、@<code>{rvalid}を取得する関数にROMを登録します
(
@<list>{mmio_controller.veryl.rom.get_device_ready}、
@<list>{mmio_controller.veryl.rom.get_device_rvalid}
)。

//list[mmio_controller.veryl.rom.get_device_ready][インターフェースのreadyを返す (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,get_device_ready)
        case device {
            Device::RAM: return ram_membus.ready;
            @<b>|Device::ROM: return rom_membus.ready;|
            default    : {}
        }
#@end
//}

//list[mmio_controller.veryl.rom.get_device_rvalid][インターフェースのrvalidを返す (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,get_device_rvalid)
        case device {
            Device::RAM: return ram_membus.rvalid;
            @<b>|Device::ROM: return rom_membus.rvalid;|
            default    : {}
        }
#@end
//}

ROMの@<code>{rvalid}、@<code>{rdata}を@<code>{req_core}に割り当てます
(
@<list>{mmio_controller.veryl.rom.assign_device_slave}
)。

//list[mmio_controller.veryl.rom.assign_device_slave][assign_device_slave関数でROMの結果をreqに割り当てる (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,assign_device_slave)
        case device {
            Device::RAM: req <> ram_membus;
            @<b>|Device::ROM: req <> rom_membus;|
            default    : {}
        }
#@end
//}

ROMのインターフェースに要求を割り当てます
(
@<list>{mmio_controller.veryl.rom.assign_device_master}
)。
RAMと同じようにメモリマップのベースアドレスを引いたアドレスを割り当てます。

//list[mmio_controller.veryl.rom.assign_device_master][get_device関数でROMにreqを割り当ててアクセス要求する (mmio_controller.veryl)]{
#@maprange(scripts/12/rom-range/core/src/mmio_controller.veryl,assign_device_master)
        case get_device(req.addr) {
            Device::RAM: {
                ram_membus      <> req;
                ram_membus.addr -= MMAP_RAM_BEGIN;
            }
            @<b>|Device::ROM: {|
            @<b>|    rom_membus      <> req;|
            @<b>|    rom_membus.addr -= MMAP_ROM_BEGIN;|
            @<b>|}|
            default: {}
        }
#@end
//}

=== ROMの初期値のパラメータを作成する

topモジュールにROMの初期値を指定するパラメータを定義します
(
@<list>{top.veryl.rom.assign_device_master}
)。

//list[top.veryl.rom.assign_device_master][パラメータを定義する (top.veryl)]{
#@maprange(scripts/12/rom-range/core/src/top.veryl,port)
module top #(
    param RAM_FILEPATH_IS_ENV: bit    = 1              ,
    param RAM_FILEPATH       : string = "RAM_FILE_PATH",
    @<b>|param ROM_FILEPATH_IS_ENV: bit    = 1              ,|
    @<b>|param ROM_FILEPATH       : string = "ROM_FILE_PATH",|
) (
#@end
//}

RAMと同じように、シミュレータ用のプログラムでROMのHEXファイルのパスを指定するようにします。
1番目の引数をROM用のHEXファイルのパスに変更し、環境変数@<code>{ROM_FILE_PATH}をその値に設定します
(
@<list>{tb_verilator.cpp.rom.arg}、
@<list>{tb_verilator.cpp.rom.path}、
@<list>{tb_verilator.cpp.rom.cycles}、
@<list>{tb_verilator.cpp.rom.setenv}、
@<list>{tb_verilator.cpp.rom.back}
)。

//list[tb_verilator.cpp.rom.arg][引数の名称を変える (tb_verilator.cpp)]{
#@maprange(scripts/12/rom-range/core/src/tb_verilator.cpp,arg)
    if (argc < @<b>|3|) {
        std::cout << "Usage: " << argv[0] << " @<b>|ROM_FILE_PATH| RAM_FILE_PATH [CYCLE]" << std::endl;
        return 1;
    }
#@end
//}

//list[tb_verilator.cpp.rom.path][ROMのHEXファイルのパスを生成する (tb_verilator.cpp)]{
#@maprange(scripts/12/rom-range/core/src/tb_verilator.cpp,path)
    // メモリの初期値を格納しているファイル名
    @<b>|std::string rom_file_path = argv[1];|
    std::string ram_file_path = argv[@<b>|2|];
    try {
        // 絶対パスに変換する
        @<b>|rom_file_path = fs::absolute(rom_file_path).string();|
        @<b>|ram_file_path = fs::absolute(ram_file_path).string();|
    } catch (const std::exception& e) {
        std::cerr << "Invalid memory file path : " << e.what() << std::endl;
        return 1;
    }
#@end
//}

//list[tb_verilator.cpp.rom.cycles][引数の数が変わったのでインデックスを変更する (tb_verilator.cpp)]{
#@maprange(scripts/12/rom-range/core/src/tb_verilator.cpp,cycles)
    unsigned long long cycles = 0;
    if (argc >= @<b>|4|) {
        std::string cycles_string = argv[@<b>|3|];
        try {
            cycles = stoull(cycles_string);
        } catch (const std::exception& e) {
            std::cerr << "Invalid number: " << argv[@<b>|3|] << std::endl;
            return 1;
        }
    }
#@end
//}

//list[tb_verilator.cpp.rom.setenv][環境変数を変更する (tb_verilator.cpp)]{
#@maprange(scripts/12/rom-range/core/src/tb_verilator.cpp,setenv)
    @<b>|const char* original_env_rom = getenv("ROM_FILE_PATH");|
    const char* original_env_ram = getenv("RAM_FILE_PATH");
    @<b>|setenv("ROM_FILE_PATH", rom_file_path.c_str(), 1);|
    setenv("RAM_FILE_PATH", ram_file_path.c_str(), 1);
#@end
//}

//list[tb_verilator.cpp.rom.back][環境変数を元に戻す (tb_verilator.cpp)]{
#@maprange(scripts/12/rom-range/core/src/tb_verilator.cpp,back)
    @<b>|if (original_env_rom != nullptr){|
    @<b>|    setenv("ROM_FILE_PATH", original_env_rom, 1);|
    @<b>|}|
    if (original_env_ram != nullptr){
        setenv("RAM_FILE_PATH", original_env_ram, 1);
    }
#@end
//}

テストを実行するためのPythonプログラムでROMのHEXファイルを指定できるようにします
(
@<list>{test.py.rom.arg}、
@<list>{test.py.rom.test}、
@<list>{test.py.rom.walk}
)。
デフォルト値はカレントディレクトリの@<code>{bootrom.hex}にしておきます。

//list[test.py.rom.arg][引数--romを追加する (test/test.py)]{
#@maprange(scripts/12/rom-range/core/test/test.py,arg)
parser.add_argument("--rom", default="bootrom.hex", help="hex file of rom")
#@end
//}

//list[test.py.rom.test][シミュレータにROMのHEXファイルのパスを渡す (test/test.py)]{
#@maprange(scripts/12/rom-range/core/test/test.py,test)
def test(@<b>|romhex, |file_name):
    result_file_path = os.path.join(args.output_dir, file_name.replace(os.sep, "_") + ".txt")
    cmd = @<b>|f"{args.sim_path} {romhex} {file_name} 0"|
    success = False
#@end
//}

//list[test.py.rom.walk][test関数にROMのHEXファイルのパスを渡す (test/test.py)]{
#@maprange(scripts/12/rom-range/core/test/test.py,walk)
    for hexpath in dir_walk(args.dir):
        f, s = test(@<b>|os.path.abspath(args.rom),| os.path.abspath(hexpath))
        res_strs.append(("PASS" if s else "FAIL") + " : " + f)
        res_statuses.append(s)
#@end
//}

=== ROMとmmio_controllerモジュールを接続する

ROMをインスタンス化してmmio_controllerモジュールと接続します。

ROMとmmio_controllerモジュールを接続するインターフェース(@<code>{mmio_rom_membus})、
ROMのインターフェース(@<code>{rom_membus})を定義します
(@<list>{top.veryl.rom.interface})。

//list[top.veryl.rom.interface][ROMのインターフェースの定義 (top.veryl)]{
#@maprange(scripts/12/rom-range/core/src/top.veryl,interface)
    inst mmio_membus    : Membus;
    inst mmio_ram_membus: Membus;
    @<b>|inst mmio_rom_membus: Membus;|
    inst ram_membus     : membus_if::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH>;
    @<b>|inst rom_membus     : membus_if::<ROM_DATA_WIDTH, ROM_ADDR_WIDTH>;|
#@end
//}

ROMをインスタンス化します
(
@<list>{top.veryl.rom.inst}
)。
パラメータにはtopモジュールのパラメータを割り当てます。

//list[top.veryl.rom.inst][ROMをインスタンス化する (top.veryl)]{
#@maprange(scripts/12/rom-range/core/src/top.veryl,inst)
    inst rom: memory::<ROM_DATA_WIDTH, ROM_ADDR_WIDTH> #(
        FILEPATH_IS_ENV: ROM_FILEPATH_IS_ENV,
        FILEPATH       : ROM_FILEPATH       ,
    ) (
        clk               ,
        rst               ,
        membus: rom_membus,
    );
#@end
//}

mmio_controllerモジュールに@<code>{rom_membus}を接続します
(
@<list>{top.veryl.rom.mmioc}
)。

//list[top.veryl.rom.mmioc][ROMのインターフェースを接続する (top.veryl)]{
#@maprange(scripts/12/rom-range/core/src/top.veryl,mmioc)
    inst mmioc: mmio_controller (
        clk                        ,
        rst                        ,
        req_core  : mmio_membus    ,
        ram_membus: mmio_ram_membus,
        @<b>|rom_membus: mmio_rom_membus,|
    );
#@end
//}

mmio_controllerモジュールとROMを接続します。
アドレスの変換のためにaddr_to_memaddr関数を使用しています
(
@<list>{top.veryl.rom.connect}
)。

//list[top.veryl.rom.connect][mmio_controllerモジュールとROMを接続する (top.veryl)]{
#@maprange(scripts/12/rom-range/core/src/top.veryl,connect)
    always_comb {
        // mmio <> ROM
        rom_membus.valid       = mmio_rom_membus.valid;
        mmio_rom_membus.ready  = rom_membus.ready;
        rom_membus.addr        = addr_to_memaddr::<ROM_DATA_WIDTH, ROM_ADDR_WIDTH>(mmio_rom_membus.addr);
        rom_membus.wen         = 0;
        rom_membus.wdata       = 0;
        rom_membus.wmask       = 0;
        mmio_rom_membus.rvalid = rom_membus.rvalid;
        mmio_rom_membus.rdata  = rom_membus.rdata;
    }
#@end
//}

=== ROMからRAMにジャンプする

PCの初期値をROMのベースアドレスに変更し、
ROMからRAMにジャンプする仕組みを実現します。

一般的にCPUの電源をつけると、CPUはROMのようなメモリデバイスに入ったソフトウェアから実行を開始します。
そのソフトウェアは次に実行するソフトウェアを外部記憶装置から読み取り、
RAMにソフトウェアを適切にコピー、配置して実行します。

本章ではRAM、ROMともに@<code>{$readmemh}システムタスクで初期化するように実装しているので、
RAMのベースアドレスにジャンプするだけのプログラムをROMに設定します。

ROMに設定するためのHEXファイルを作成します
(@<list>{bootrom.hex.rom})。

//list[bootrom.hex.rom][RAMの開始アドレスにジャンプするプログラム (bootrom.hex)]{
#@mapfile(scripts/12/rom-range/core/bootrom.hex)
00409093080000b7 // 0: lui x1, 0x08000 4: slli x1, x1, 4
0000000000008067 // 8: jalr x0, 0(x1)  c:
0000000000000000 // zero

#@end
//}

PCの初期値をROMのベースアドレスに変更します
(
@<list>{eei.veryl.rom.pc}
)。

//list[eei.veryl.rom.pc][PCの初期値の変更 (eei.veryl)]{
#@maprange(scripts/12/rom-range/core/src/eei.veryl,pc)
    const INITIAL_PC: Addr = @<b>|MMAP_ROM_BEGIN|;
#@end
//}

riscv-testsを実行し、
ROM(@<code>{0x1000})から実行を開始して
RAM(@<code>{0x80000000})にジャンプしてテストを開始していることを確かめてください。

== デバッグ用の入出力デバイスの実装

CPUが文字を送信したり受信するためのデバッグ用の入出力デバイスを実装します。
今のところriscv-testsの結果を受け取るためのアドレスをRAMのベースアドレス + @<code>{0x1000}にしていますが、
この処理もデバイスに実装します。

本章では、デバッグ用の入出力デバイスに次のような64ビットレジスタを実装します。

 : 上位20ビットが@<code>{20'h01010}な値を書き込み
    下位8ビットを文字として解釈し@<code>{$write}システムタスクで出力します。
 : 上位20ビットが@<code>{20'h01010}ではないLSBが@<code>{1}な値を書き込み
    今までのriscv-testsの終了判定処理を行います。
 : 読み込み
    C++プログラムの関数を利用して1文字入力を受け取ります。
    有効な入力の場合は上位20ビットが@<code>{20'h01010}、無効な入力の場合は@<code>{0}になります。

=== デバイスのアドレスを設定する

@<list>{top.veryl.memtoram.port}でデバイスのアドレスをポートで設定できるようにしたので、
@<code>{tb_verilator.cpp}で環境変数の値をデバイスのアドレスに設定するようにします。

環境変数@<code>{DBG_ADDR}を読み込み、@<code>{DBG_ADDR}ポートに設定します
(
@<list>{tb_verilator.cpp.debugout.Device}
)。

//list[tb_verilator.cpp.debugout.Device][DBG_ADDRポートに環境変数の値を設定する (tb_verilator.cpp)]{
#@maprange(scripts/12/debugout-range/core/src/tb_verilator.cpp,set)
    // デバッグ用の入出力デバイスのアドレスを取得する
    @<b>|const char* dbg_addr_c = getenv("DBG_ADDR");|
    @<b>|const unsigned long long DBG_ADDR = dbg_addr_c == nullptr ? 0 : std::strtoull(dbg_addr_c, nullptr, 0);|

    // top
    Vcore_top *dut = new Vcore_top();
    @<b>|dut->MMAP_DBG_ADDR = DBG_ADDR;|
#@end
//}

=== mmio_controllerモジュールにデバイスを追加する

mmio_controllerモジュールにデバイスを追加します。

@<code>{Device}型に@<code>{Device::DEBUG}を追加します
(
@<list>{mmio_controller.veryl.debugout.Device}
)。

//list[mmio_controller.veryl.debugout.Device][Device型にデバッグ用の入出力デバイスを追加する (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,Device)
    enum Device {
        UNKNOWN,
        RAM,
        ROM,
        @<b>|DEBUG,|
    }
#@end
//}

ポートにインターフェースとデバイスのアドレスを追加します
(
@<list>{mmio_controller.veryl.debugout.port}、
@<list>{mmio_controller.veryl.debugout.reset_all}
)。

#@# mapにする
//list[mmio_controller.veryl.debugout.port][DBG_ADDR、インターフェースを追加する (mmio_controller.veryl)]{
#@# maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,port)
module mmio_controller (
    clk       : input   clock         ,
    rst       : input   reset         ,
    @<b>|DBG_ADDR  : input   Addr          ,|
    req_core  : modport Membus::slave ,
    ram_membus: modport Membus::master,
    rom_membus: modport Membus::master,
    @<b>|dbg_membus: modport Membus::master,|
) {
#@# end
//}

//list[mmio_controller.veryl.debugout.reset_all][インターフェースの要求部分をリセットする (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,reset_all)
    function reset_all_device_masters () {
        reset_membus_master(ram_membus);
        reset_membus_master(rom_membus);
        @<b>|reset_membus_master(dbg_membus);|
    }
#@end
//}

デバイスの位置を設定します。
最初にチェックすることで、他のデバイスとアドレスを被らせたとしてもデバッグ用の入出力デバイスを優先します
(
@<list>{mmio_controller.veryl.debugout.get_device}
)。

//list[mmio_controller.veryl.debugout.get_device][get_device関数でデバイスの範囲を定義する (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,get_device)
    function get_device (
        addr: input Addr,
    ) -> Device {
        @<b>|if DBG_ADDR <= addr && addr <= DBG_ADDR + 7 {|
        @<b>|    return Device::DEBUG;|
        @<b>|}|
        if MMAP_ROM_BEGIN <= addr && addr <= MMAP_ROM_END {
            return Device::ROM;
        }
        if addr >= MMAP_RAM_BEGIN {
            return Device::RAM;
        }
        return Device::UNKNOWN;
    }
#@end
//}

インターフェースを設定します
(
@<list>{mmio_controller.veryl.debugout.assign_device_master}、
@<list>{mmio_controller.veryl.debugout.assign_device_slave}、
@<list>{mmio_controller.veryl.debugout.get_device_ready}、
@<list>{mmio_controller.veryl.debugout.get_device_rvalid}
)。
この変更はROMを追加したときとほとんど同じです。

//list[mmio_controller.veryl.debugout.assign_device_master][assign_device_master関数の変更 (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,assign_device_master)
        case get_device(req.addr) {
            Device::RAM: {
                ram_membus      <> req;
                ram_membus.addr -= MMAP_RAM_BEGIN;
            }
            Device::ROM: {
                rom_membus      <> req;
                rom_membus.addr -= MMAP_ROM_BEGIN;
            }
            @<b>|Device::DEBUG: {|
            @<b>|    dbg_membus      <> req;|
            @<b>|    dbg_membus.addr -= DBG_ADDR;|
            @<b>|}|
            default: {}
        }
#@end
//}

//list[mmio_controller.veryl.debugout.assign_device_slave][assign_device_slave関数の変更 (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,assign_device_slave)
        case device {
            Device::RAM  : req <> ram_membus;
            Device::ROM  : req <> rom_membus;
            @<b>|Device::DEBUG: req <> dbg_membus;|
            default      : {}
        }
#@end
//}

//list[mmio_controller.veryl.debugout.get_device_ready][get_device_ready関数の変更 (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,get_device_ready)
        case device {
            Device::RAM  : return ram_membus.ready;
            Device::ROM  : return rom_membus.ready;
            @<b>|Device::DEBUG: return dbg_membus.ready;|
            default      : {}
        }
#@end
//}

//list[mmio_controller.veryl.debugout.get_device_rvalid][get_device_rvalid関数の変更 (mmio_controller.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/mmio_controller.veryl,get_device_rvalid)
        case device {
            Device::RAM  : return ram_membus.rvalid;
            Device::ROM  : return rom_membus.rvalid;
            @<b>|Device::DEBUG: return dbg_membus.rvalid;|
            default      : {}
        }
#@end
//}

topモジュールにデバッグ用の入出力デバイスのインターフェース(@<code>{dbg_membus})を定義し、
mmio_controllerモジュールと接続します
(
@<list>{top.veryl.debugout.interface}、
@<list>{top.veryl.debugout.mmioc}
)。

//list[top.veryl.debugout.interface][インターフェースのインスタンス化 (top.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/top.veryl,interface)
    inst ram_membus     : membus_if::<RAM_DATA_WIDTH, RAM_ADDR_WIDTH>;
    inst rom_membus     : membus_if::<ROM_DATA_WIDTH, ROM_ADDR_WIDTH>;
    @<b>|inst dbg_membus     : Membus;|
#@end
//}

//list[top.veryl.debugout.mmioc][インターフェースを接続する (top.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/top.veryl,mmioc)
    inst mmioc: mmio_controller (
        clk                        ,
        rst                        ,
        DBG_ADDR  : MMAP_DBG_ADDR  ,
        req_core  : mmio_membus    ,
        ram_membus: mmio_ram_membus,
        rom_membus: mmio_rom_membus,
        @<b>|dbg_membus                 ,|
    );
#@end
//}

=== 出力を実装する

@<code>{dbg_membus}を使い、デバッグ出力処理を実装します。
既存のriscv-testsの終了検知処理を次のように書き換えます
(
@<list>{top.veryl.debugout.io}
)。

//list[top.veryl.debugout.io][riscv-testsの終了検知処理をデバッグ用の入出力デバイスに変更する (top.veryl)]{
#@maprange(scripts/12/debugout-range/core/src/top.veryl,io)
    // デバッグ用のIO
    always_ff {
        dbg_membus.ready  = 1;
        dbg_membus.rvalid = dbg_membus.valid;
        if dbg_membus.valid {
            if dbg_membus.wen {
                if dbg_membus.wdata[MEMBUS_DATA_WIDTH - 1-:20] == 20'h01010 {
                    $write("%c", dbg_membus.wdata[7:0]);
                } else if dbg_membus.wdata[lsb] == 1'b1 {
                    #[ifdef(TEST_MODE)]
                    {
                        test_success = dbg_membus.wdata == 1;
                    }
                    if dbg_membus.wdata == 1 {
                        $display("test success!");
                    } else {
                        $display("test failed!");
                        $error  ("wdata : %h", dbg_membus.wdata);
                    }
                    $finish();
                }
            }
        }
    }
#@end
//}

常に要求を受け付け、書き込みの時は書き込むデータ(@<code>{wdata})を確認します。
@<code>{wdata}の上位20ビットが@<code>{20'h01010}なら下位8ビットを出力し、
LSBが@<code>{1}ならテストの成功判定をして@<code>{$finish}システムタスクを呼び出します。

==={debugout_howto} 出力をテストする

実装した出力デバイスで文字を出力できることを確認します。

デバッグ用に@<code>{$display}システムタスクで表示している情報が邪魔になるので、
デバッグ情報の表示を環境変数@<code>{PRINT_DEBUG}で制御できるようにします
(
@<list>{core.veryl.debugout.debug}
)。

//list[core.veryl.debugout.debug][デバッグ出力をdefineで囲う (core.veryl)]{
#@# maprange(scripts/12/debugout-range/core/src/core.veryl,debug)
    ///////////////////////////////// DEBUG /////////////////////////////////
    @<b>|#[ifdef(PRINT_DEBUG)]|
    @<b>|{|
        var clock_count: u64;

        always_ff {
            if_reset {
                clock_count = 1;
            } else {
                clock_count = clock_count + 1;

                $display("");
                $display("# %d", clock_count);
#@# end
//}

@<code>{test/debug_output.c}を作成し、次のように記述します
(
@<list>{debug_output.c.debugouttest}
)。
これは@<code>{Hello,world!}と出力するプログラムです。

//list[debug_output.c.debugouttest][Hello,world!を出力するプログラム (test/debug_output.c)]{
#@mapfile(scripts/12/debugouttest/core/test/debug_output.c)
#define DEBUG_REG ((volatile unsigned long long*)0x40000000)

void main(void) {
    int strlen = 13;
    unsigned char str[13];

    str[0]  = 'H';
    str[1]  = 'e';
    str[2]  = 'l';
    str[3]  = 'l';
    str[4]  = 'o';
    str[5]  = ',';
    str[6]  = 'w';
    str[7]  = 'o';
    str[8]  = 'r';
    str[9]  = 'l';
    str[10] = 'd';
    str[11] = '!';
    str[12] = '\n';

    for (int i = 0; i < strlen; i++) {
        unsigned long long c = str[i];
        *DEBUG_REG = c | (0x01010ULL << 44);
    }
    *DEBUG_REG = 1;
}
#@end
//}

@<code>{DEBUG_REG}は出力デバイスのアドレスです。
ここに@<code>{0x01010}を44ビット左シフトした値と文字をOR演算した値を書き込むことで文字を出力します。
最後に@<code>{1}を書き込み、テストを終了しています。

main関数をそのままコンパイルしてRAMに配置すると、
スタックポインタ(stack pointer, sp)の値が適切に設定されていないのでうまく動きません。
スタックポインタとは、プログラムが一時的に利用する値を格納しておくためのメモリ(スタック)のアドレスへのポインタのことです。
RISC-Vの規約ではsp(x2)レジスタをスタックポインタとして利用することが定められています。

そのため、レジスタの値を適切な値にリセットしてmain関数を呼び出す別のプログラムが必要です。
@<code>{test/entry.S}を作成し、次のように記述します
(
@<list>{entry.S.debugouttest}
)。

//list[entry.S.debugouttest][test/entry.S]{
#@mapfile(scripts/12/debugouttest/core/test/entry.S)
.global _start
.section .text.init
_start:
    add x1, x0, x0
    la  x2, _stack_bottom
    add x3, x0, x0
    add x4, x0, x0
    add x5, x0, x0
    add x6, x0, x0
    add x7, x0, x0
    add x8, x0, x0
    add x9, x0, x0
    add x10, x0, x0
    add x11, x0, x0
    add x12, x0, x0
    add x13, x0, x0
    add x14, x0, x0
    add x15, x0, x0
    add x16, x0, x0
    add x17, x0, x0
    add x18, x0, x0
    add x19, x0, x0
    add x20, x0, x0
    add x21, x0, x0
    add x22, x0, x0
    add x23, x0, x0
    add x24, x0, x0
    add x25, x0, x0
    add x26, x0, x0
    add x27, x0, x0
    add x28, x0, x0
    add x29, x0, x0
    add x30, x0, x0
    add x31, x0, x0
    call main
#@end
//}

このアセンブリはsp(x2)レジスタを@<code>{_stack_bottom}のアドレスに設定し、
他のレジスタを@<code>{0}でリセットしたあとに@<code>{main}にジャンプします。

@<code>{_stack_bottom}は、リンカの設定ファイルに記述します。
@<code>{test/link.ld}を作成し、次のように記述します
(
@<list>{link.ld.debugouttest}
)。

//list[link.ld.debugouttest][test/link.ld]{
#@mapfile(scripts/12/debugouttest/core/test/link.ld)
OUTPUT_ARCH( "riscv" )
ENTRY(_start)

SECTIONS
{
  . = 0x80000000;
  .text.init : { *(.text.init) }
  .text : { *(.text*) }
  .data : { *(.data*) }
  .bss : {*(.bss*)}
  .stack : {
    . = ALIGN(0x10);
    _stack_top = .;
    . += 4K;
    _stack_bottom = .;
  }
  _end = .;
}
#@end
//}

@<code>{_stack_bottom}と@<code>{_stack_top}の間は4KBあるので、スタックのサイズは4KBになります。
@<code>{_start}を@<code>{.text.init}に配置し(@<list>{entry.S.debugouttest})、
@<code>{SECTIONS}の先頭に@<code>{.text.init}を配置しているため、
アドレス@<code>{0x80000000}に@<code>{_start}が配置されます。

これらのファイルを利用し、テストプログラムをコンパイルします
(@<list>{term.compile.test.1})。
gccの@<code>{-march}フラグではC拡張を抜いたISAを指定しています。
このフラグを記述しないと、まだ実装していない命令が含まれたELFファイルにコンパイルされてしまいます。

//terminal[term.compile.test.1][テストプログラムをコンパイル、HEXファイルに変換する]{
$ @<userinput>{cd test}
$ @<userinput>{riscv64-unknown-elf-gcc -nostartfiles -nostdlib -mcmodel=medany -T link.ld -march=rv64imad debug_output.c entry.S}
$ @<userinput>{riscv64-unknown-elf-objcopy a.out -O binary test.bin}
$ @<userinput>{python3 bin2hex.py 8 test.bin > test.bin.hex} @<balloon>{HEXファイルに変換する}
//}

シミュレータをビルドし、テストプログラムを実行します
(@<list>{term.compile.test.2})。

//terminal[term.compile.test.2][テストプログラムを実行する]{
$ @<userinput>{make build sim}
$ @<userinput>{DBG_ADDR=0x40000000 ./obj_dir/sim bootrom.hex test/test.bin.hex}
Hello,world!
- ~/core/src/top.sv:62: Verilog $finish
//}

@<code>{Hello,world!}と出力されたあと、プログラムが終了しました。

=== riscv-testsに対応する

riscv-testsを実行するとき、
終了判定用のレジスタの位置を@<code>{DBG_ADDR}に設定するようにします。

@<code>{test/test.py}を、
ELFファイルを探して自動で@<code>{DBG_ADDR}を設定してテストを実行するプログラムに変更します。

elftools@<fn>{elftools_install}を使用し、ELFファイルの判定、セクションのアドレスを取得する関数を定義します
(
@<list>{test.py.debugouttest.import}、
@<list>{test.py.debugouttest.func}
)。

//footnote[elftools_install][pipでインストールできます]

//list[test.py.debugouttest.import][elftoolsのimport (test/test.py)]{
#@map_range(scripts/12/debugouttest-range/core/test/test.py,import)
from elftools.elf.elffile import ELFFile
#@end
//}

//list[test.py.debugouttest.func][ELFの判定、セクションのアドレスを取得する関数の定義 (test/test.py)]{
#@map_range(scripts/12/debugouttest-range/core/test/test.py,func)
def is_elf(filepath):
    try:
        with open(filepath, 'rb') as f:
            magic_number = f.read(4)
            return magic_number == b'\x7fELF'
    except:
        return False

def get_section_address(filepath, section_name):
    try:
        with open(filepath, 'rb') as f:
            elffile = ELFFile(f)
            for section in elffile.iter_sections():
                if section.name == section_name:
                    return section.header['sh_addr']
            return 0
    except:
        return 0
#@end
//}

デバッグ用の入出力デバイスのセクション名を指定する引数を作成します
(
@<list>{test.py.debugouttest.args}
)。
また、テストするファイルの拡張子を指定していた引数を、
ELFファイルに付加することでHEXファイルのパスを得るための引数に変更します。

//list[test.py.debugouttest.args][オプションを追加する (test/test.py)]{
#@map_range(scripts/12/debugouttest-range/core/test/test.py,args)
parser.add_argument("-e", "--extension", default="@<b>|.bin.|hex", help="@<b>|hex| file extension")
@<b>|parser.add_argument("-d", "--debug_label", default=".tohost", help="debug device label")|
#@end
//}

dir_walk関数を、ELFファイルを探す関数に変更します
(
@<list>{test.py.debugouttest.dir_walk}
)。

//list[test.py.debugouttest.dir_walk][dir_walk関数でELFファイルを探す (test/test.py)]{
#@map_range(scripts/12/debugouttest-range/core/test/test.py,dir_walk)
if entry.is_file():
    if not @<b>|is_elf(entry.path)|:
        continue
    if len(args.files) == 0:
        yield entry.path
#@end
//}

シミュレータの実行で@<code>{DBG_ADDR}を指定するようにします
(
@<list>{test.py.debugouttest.test}、
@<list>{test.py.debugouttest.for}
)。

//list[test.py.debugouttest.test][DBG_ADDRをシミュレータに渡す (test/test.py)]{
#@map_range(scripts/12/debugouttest-range/core/test/test.py,test)
def test(@<b>|dbg_addr,| romhex, file_name):
    result_file_path = os.path.join(args.output_dir, file_name.replace(os.sep, "_") + ".txt")
    @<b>|env = f"DBG_ADDR={dbg_addr} "|
    cmd = f"{args.sim_path} {romhex} {file_name} 0"
    success = False
    with open(result_file_path, "w") as f:
        no = f.fileno()
        p = subprocess.Popen(@<b>|" ".join([env, "exec", cmd])|, shell=True, stdout=no, stderr=no)
#@end
//}

//list[test.py.debugouttest.for][DBG_ADDRをtest関数に渡す (test/test.py)]{
#@map_range(scripts/12/debugouttest-range/core/test/test.py,for)
for @<b>|elf|path in dir_walk(args.dir):
    @<b>|hexpath = elfpath + args.extension|
    @<b>|if not os.path.exists(hexpath):|
    @<b>|    print("SKIP :", elfpath)|
    @<b>|    continue|
    @<b>|dbg_addr = get_section_address(elfpath, args.debug_label)|
    f, s = test(@<b>|dbg_addr,| os.path.abspath(args.rom), os.path.abspath(hexpath))
    res_strs.append(("PASS" if s else "FAIL") + " : " + f)
    res_statuses.append(s)
#@end
//}

@<code>{VERILATOR_FLAGS="-DTEST_MODE"}をつけてシミュレータをビルドし、
riscv-testsが正常終了することを確かめてください。

=== 入力を実装する

@<code>{dbg_membus}を使い、デバッグ入力処理を実装します。

まず、@<code>{src/tb_verilator.cpp}に、標準入力から1文字取得する関数を定義します
(
@<list>{tb_verilator.cpp.debuginput.get_input_dpic}
)。
入力がない場合は@<code>{0}、ある場合は上位20ビットを@<code>{0x01010}にした値を返します。

//list[tb_verilator.cpp.debuginput.get_input_dpic][標準入力を1文字取得する関数の定義 (src/tb_verilator.cpp)]{
#@map_range(scripts/12/debuginput-range/core/src/tb_verilator.cpp,get_input_dpic)
extern "C" const unsigned long long get_input_dpic() {
    unsigned char c = 0;
    ssize_t bytes_read = read(STDIN_FILENO, &c, 1);

    if (bytes_read == 1) {
        return static_cast<unsigned long long>(c) | (0x01010ULL << 44);
    }
    return 0;
}
#@end
//}

ここで、read関数の呼び出しでシミュレータを止めず(@<code>{O_NONBLOCK})、
シェルが入力をバッファリングしなくする(@<code>{~ICANON})ために設定を変えるコードを挿入します。
また、シェルが文字列をローカルエコー(入力した文字列を表示)しないようにします(@<code>{~ECHO})
(
@<list>{tb_verilator.cpp.debuginput.include}、
@<list>{tb_verilator.cpp.debuginput.termios}、
@<list>{tb_verilator.cpp.debuginput.set}
)。

//list[tb_verilator.cpp.debuginput.include][includeを追加する (src/tb_verilator.cpp)]{
#@maprange(scripts/12/debuginput-range/core/src/tb_verilator.cpp,include)
#include <fcntl.h>
#include <termios.h>
#include <signal.h>
#@end
//}

//list[tb_verilator.cpp.debuginput.termios][設定を変更、復元する関数の定義 (src/tb_verilator.cpp)]{
#@maprange(scripts/12/debuginput-range/core/src/tb_verilator.cpp,termios)
struct termios old_setting;

void restore_termios_setting(void) {
    tcsetattr(STDIN_FILENO, TCSANOW, &old_setting);
}

void sighandler(int signum) {
    restore_termios_setting();
    exit(signum);
}

void set_nonblocking(void) {
    struct termios new_setting;

    if (tcgetattr(STDIN_FILENO, &old_setting) == -1) {
        perror("tcgetattr");
        return;
    }
    new_setting = old_setting;
    new_setting.c_lflag &= ~(ICANON | ECHO);
    if (tcsetattr(STDIN_FILENO, TCSANOW, &new_setting) == -1) {
        perror("tcsetattr");
        return;
    }
    signal(SIGINT, sighandler);
    signal(SIGTERM, sighandler);
    signal(SIGQUIT, sighandler);
    atexit(restore_termios_setting);

    int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
    if (flags == -1) {
        perror("fcntl(F_GETFL)");
        return;
    }
    if (fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK) == -1) {
        perror("fcntl(F_SETFL)");
        return;
    }
}
#@end
//}

//list[tb_verilator.cpp.debuginput.set][設定を変える関数をmain関数から呼び出す (src/tb_verilator.cpp)]{
#@maprange(scripts/12/debuginput-range/core/src/tb_verilator.cpp,set)
int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);

    if (argc < 3) {
        std::cout << "Usage: " << argv[0] << " ROM_FILE_PATH RAM_FILE_PATH [CYCLE]" << std::endl;
        return 1;
    }

    @<b>|#ifdef ENABLE_DEBUG_INPUT|
        @<b>|set_nonblocking();|
    @<b>|#endif|
#@end
//}

@<code>{src/util.veryl}にget_input_dpic関数を呼び出す関数を実装します
(
@<list>{util.veryl.debuginput}
)。

//list[util.veryl.debuginput][get_input関数を定義する (src/util.veryl)]{
#@mapfile(scripts/12/debuginput-range/core/src/util.veryl)
embed (inline) sv{{{
    package svutil;
        ...
        @<b>|import "DPI-C" context function longint get_input_dpic();|
        @<b>|function longint get_input();|
        @<b>|    return get_input_dpic();|
        @<b>|endfunction|
    endpackage
}}}

package util {
    ...
    @<b>|function get_input () -> u64 {|
    @<b>|    return $sv::svutil::get_input();|
    @<b>|}|
}
#@end
//}

デバッグ用の入出力デバイスのロードで@<code>{util::get_input}の結果を返すようにします
(
@<list>{top.veryl.debuginput.io}
)。
このコードは合成できないので、有効化オプション@<code>{ENABLE_DEBUG_INPUT}をつけます。

//list[top.veryl.debuginput.io][読み込みでget_input関数を呼び出す (src/top.veryl)]{
#@maprange(scripts/12/debuginput-range/core/src/top.veryl,io)
    always_ff {
        dbg_membus.ready  = 1;
        dbg_membus.rvalid = dbg_membus.valid;
        if dbg_membus.valid {
            if dbg_membus.wen {
                ...
            @<b>|} else {|
            @<b>|    #[ifdef(ENABLE_DEBUG_INPUT)]|
            @<b>|    {|
            @<b>|        dbg_membus.rdata = util::get_input();|
            @<b>|    }|
            }
        }
    }
#@end
//}

=== 入力をテストする

実装した入出力デバイスで文字を入出力できることを確認します。

@<code>{test/debug_input.c}を作成し、次のように記述します
(
@<list>{debug_input.c.debuginput}
)。
これは入力された文字に@<code>{1}を足した値を出力するプログラムです。

//list[debug_input.c.debuginput][test/debug_input.c]{
#@mapfile(scripts/12/debuginput-range/core/test/debug_input.c)
#define DEBUG_REG ((volatile unsigned long long*)0x40000000)

void main(void) {
    while (1) {
        unsigned long long c = *DEBUG_REG;
        if (c & (0x01010ULL << 44) == 0) {
            continue;
        }
        c = c & 255;
        *DEBUG_REG = (c + 1) | (0x01010ULL << 44);
    }
}
#@end
//}

プログラムをコンパイルしてシミュレータを実行し、入力した文字が1文字ずれて表示されることを確認してください
(@<list>{term-run-change-input})。

//terminal[term-run-change-input][テストプログラムを実行する]{
$ @<userinput>{make build sim VERILATOR_FLAGS="-DENABLE_DEBUG_INPUT"} @<balloon>{入力を有効にしてシミュレータをビルド}
$ @<userinput>{./obj_dir/sim bootrom.hex test/test.bin.hex} @<balloon>{(事前にHEXファイルを作成しておく}
bcd@<balloon>{abcと入力して改行}
   efg@<balloon>{defと入力する}
//}

