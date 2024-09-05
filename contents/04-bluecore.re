= 参考実装(bluecore)の解説

本書では、参考実装に新しい機能を実装していくことで、RISC-VとCPUの実装について学んでいきます。
本書では筆者が作成したRISC-VのCPUであるbluecoreを参考実装として利用します。
この章では、bluecoreがどのような構成になっているか、どのように命令が実行されていくかについて解説します。

== 概要

//image[bluecore_arch][bluecoreのアーキテクチャ図][]

bluecoreはハードウェア記述言語Verylで記述されている32bitのRISC-VのCPUです。
EBREAK以外のRV32Iの命令に対応していて、
他にCSRRW, CSRRS, CSRRC, CSRRWI, CSRRSI, CSRRCI, MRET命令を実行することができます。

RISC-Vのテストスイートであるriscv-testsのRV32Iの命令のテスト(rv32ui-pからはじまるテスト)をすべて正常に実行することができます。
CSRはmtvec, mepc, mcauseのみ実装しています。これはriscv-testsを実行するのに必要な最低限のレジスタです。

命令は5段のパイプライン処理で実行されます。
ステージはIF(命令フェッチ), ID(命令デコード), EX(実行), MEM(メモリ操作), WB(ライトバック)です。
データハザードの解決はIDステージで行います。また、EX, MEM, WBステージからIDステージへのフォワーディングが実装されています。

MEMステージでは、メモリ操作だけではなくCSR命令の処理と分岐ハザードの判定を行います。
分岐の成否を求めるのはEXステージですが、分岐ハザードを発生させるのはMEMステージになります。
そのため、分岐によるPCの遷移処理とCSR命令(ecallやmret)によって発生するPCの遷移処理が
同じステージで行われることになり、コードが少し単純になっています。

//terminal[filelist][ディレクトリ構成]{
bluecore
├── Makefile
├── README.md
├── core @<balloon>{Verylのプロジェクトディレクトリ}
│   ├── Makefile
│   ├── Veryl.lock
│   ├── Veryl.toml
│   └── src
│       ├── common @<balloon>{汎用のVerylプログラムをまとめたディレクトリ}
│       ├── packages @<balloon>{パッケージをまとめたディレクトリ}
│       ├── *.veryl @<balloon>{Verylのプログラム}
│       └── svconfig.sv @<balloon>{coreの設定}
├── src
│   └── tb.cpp @<balloon>{verilatorでのテスト実行用のC++プログラム}
├── synth @<balloon>{合成用のプロジェクトディレクトリ}
└── test
    ├── bin2hex.py @<balloon>{バイナリをverilogが読める形式に変換するプログラム}
    ├── riscv-tests-bin @<balloon>{カスタマイズされたriscv-tests}
    └── riscv-tests.py @<balloon>{riscv-testsを実行するプログラム}
//}

== 最上位のモジュール(top.veryl)

最上位のモジュール(トップモジュール)はtop(core/src/top.veryl)です。
topでは、memoryとcoreのインスタンス化(どちらも後述)、riscv-testsの終了判定を行っています。

//list[top.veryl.port][topのポート定義(top.veryl)]{
#@maprange(scripts/sec4/core/src/top.veryl,port)
module top (
    clk : input  logic    ,
    rst : input  logic    ,
    gpio: output logic<32>,
) {
#@end
//}

topのポートは、clk, rst, gpioと定義されています。それぞれ、クロック信号, リセット信号, 32bitの汎用のIOです。
topでは、テストの状態(成功, 失敗, 実行中)に応じて、gpioに設定する値を変更しています。

FPGA向けに合成するときは、さらに上位のモジュールを用意します。
例えばGOWINのTangMega 138K向けに合成する場合はtop_gowin.verylを利用します。
top_gowinモジュールのポート定義にはledがあり、topモジュールのgpio信号の下位6bitをledの値としています。

//list[core.inst][coreのインスタンス化(top.veryl)]{
#@maprange(scripts/sec4/core/src/top.veryl,inst_core)
    // coreのインスタンス化
    inst c: core (
        clk      ,
        rst      ,
        ibus_if  ,
        dbus_if  ,
    );
#@end
//}

topモジュールでは、memoryとcoreのインスタンス化と相互接続を行っています。
memoryはRAMのモジュールです。
RAMには命令とデータが格納されます。
coreは命令を処理するモジュールです。
coreは、命令フェッチ, ロードストアのためにRAMにアクセスするため、topモジュールで接続されています。

@<list>{core.inst}は、coreをインスタンス化している部分のコードです。
@<code>{ibus_if}, @<code>{dbus_if}はそれぞれ命令, データ用のRAMとのインターフェースです。

== メモリ, メモリバス

メモリ(RAM)とメモリバス(メモリとcoreとのインターフェース)の構成について詳しく説明します。
メモリから一度に読み込める, 書き込めるビット幅は32bitです。
これはeeiパッケージ(packages/eei.veryl)に@<code>{MEMBUS_WIDTH}として定義されています(@<list>{eei_membus})。
また、バスのビット幅のデータを表す型(@<code>{MemBusData})と、
書き込み時に使用するマスクを表す型(@<code>{MemBusMask})も定義されています。

//list[eei_membus][メモリバスの設定(packages/eei.veryl)]{
#@maprange(scripts/sec4/core/src/packages/eei.veryl,membus)
    local MEMBUS_WIDTH: u32                     = 32;
    type MemBusData   = logic<MEMBUS_WIDTH>    ;
    type MemBusMask   = logic<MEMBUS_WIDTH / 8>;
#@end
//}

//list[datamemory][メモリのインスタンス化(top.veryl)]{
#@maprange(scripts/sec4/core/src/top.veryl,inst_memory)
    // メモリのアドレスの幅
    local DATA_ADDR_WIDTH: u32 = 14;
    // アドレスのオフセット
    local DATA_ADDR_OFFSET: u32 = $clog2(MEMBUS_WIDTH / 8);

    local DATA_ADDR_MSB: u32 = DATA_ADDR_WIDTH + DATA_ADDR_OFFSET - 1;
    local DATA_ADDR_LSB: u32 = DATA_ADDR_OFFSET;

    // メモリのインスタンス化
    inst datamemory: memory #(
        DATA_WIDTH: MEMBUS_WIDTH       ,
        ADDR_WIDTH: DATA_ADDR_WIDTH    ,
        FILE_PATH : MEMORY_INITIAL_FILE,
    ) (
        clk                                          ,
        rst                                          ,
        ready : mem_ready                            ,
        valid : mem_valid                            ,
        wen   : mem_wen                              ,
        addr  : mem_addr[DATA_ADDR_MSB:DATA_ADDR_LSB],
        wdata : mem_wdata                            ,
        wmask : mem_wmask                            ,
        rvalid: mem_rvalid                           ,
        rdata : mem_rdata                            ,
    );
#@end
//}

@<list>{datamemory}は、topモジュールでメモリをインスタンス化している部分のコードです。
memoryモジュールは、@<code>{DATA_WIDTH}bitの幅のデータを2の@<code>{ADDR_WIDTH}乗個並べたメモリを生成します。
@<code>{DATA_WIDTH}は@<code>{MEMBUS_WIDTH}なので32bit、@<code>{ADDR_WIDTH}は@<code>{DATA_ADDR_WIDTH}なので14になります。
したがって、メモリの大きさは32bit(= 4byte) * 2の14乗(4096) = 16384byte = 16KBになります。

memoryモジュールはアドレス0からマッピングされます。
bluecoreにはMMIO(Memory Mapped IO)などは存在しないため、すべてのメモリ空間がmemoryモジュールへのアクセスにマップされます。

メモリの初期値は、@<code>{FILE_PATH}で指定されたファイルに記述された値になります。
メモリはビッグエンディアン形式で値を格納します。

@<code>{config::MEMORY_INITIAL_FILE}パラメータはconfigパッケージ(packages/config.veryl)に定義された文字列型の定数です。
@<code>{MEMORY_INITIAL_FILE}パラメータの値はsvconfigパッケージ(svconfig.sv)で定義された定数の値になっています。
svconfigパッケージでは、定数にマクロの値を割り当てています。
本書の執筆時点(2024/05)ではVerylにマクロ機能が存在しないため、SystemVerilogを利用することによってマクロの値を取得しています。

//note[RAMの初期値]{
bluecoreの初期状態ではFPGAへの合成を前提としているため、RAMの値を$readmemhシステムタスクによって初期化しています。
普通のCPUではCPUの実行をROMに格納された命令から開始し、補助記憶からRAMに命令やデータを読み込んで実行します。
本書では、bluecoreが命令をそのような順で実行するように実装を変更していきます。
//}

memoryモジュールのポートは、名前がmem_から始まるワイヤを介して接続されます。
@<list>{membus_ctrl}は、メモリとインターフェースを接続している部分のコードです。
@<code>{ibus_if}は命令フェッチ用, @<code>{dbus_if}はロードストア用としてインターフェースが定義されています。

//list[membus_ctrl][mem_*とインターフェースの接続(top.veryl)]{
#@maprange(scripts/sec4/core/src/top.veryl,membus_ctrl)
    // メモリとinterfaceの接続
    always_comb {
        // load/storeを優先する
        ibus_if.ready      = mem_ready & !dbus_if.valid;
        ibus_if.resp_valid = memarb_last_is_i & mem_rvalid;
        ibus_if.resp_rdata = mem_rdata;

        dbus_if.ready      = mem_ready;
        dbus_if.resp_valid = !memarb_last_is_i & mem_rvalid;
        dbus_if.resp_rdata = mem_rdata;

        mem_valid = ibus_if.valid | dbus_if.valid;
        if dbus_if.valid {
            mem_wen   = dbus_if.wen;
            mem_addr  = dbus_if.addr;
            mem_wdata = dbus_if.wdata;
            mem_wmask = dbus_if.wmask;
        } else {
            mem_wen   = 0;
            mem_addr  = ibus_if.addr;
            mem_wdata = ibus_if.wdata;
            mem_wmask = ibus_if.wmask;
        }
    }
#@end
//}

ibus_if.readyは、命令フェッチの要求をメモリが受け付けることができるかを示すワイヤです。
これは、メモリモジュールが要求を受け付けることができる(@<code>{mem_ready})、
@<code>{dbus_if}がロードストアの要求をしようとしていない(@<code>{!dbus_if.valid})
という2つの条件が満たされるときにのみ@<code>{1}になります。
一方、ロードストアの要求を受け付けるかどうか(@<code>{dbus_if.ready})は、@<code>{mem_ready}のみを条件としています。
したがって、メモリが利用できるときは命令フェッチではなくロードストアが優先されることになります。

メモリへの指令は、@<code>{dbus_if.valid}が@<code>{1}のときに@<code>{dbus_if}の値になり、
@<code>{0}のときには@<code>{ibus_if}の値になります。
@<code>{ibus_if}の値が採用されるとき、命令フェッチではメモリの値を書き換えないため、
書き込み命令かどうか(@<code>{mem_wen})は常に@<code>{0}になります。

== パイプライン処理

前述のとおり、bluecoreは5ステージのパイプライン処理を行うCPUです。
パイプライン処理とは、
「各処理がステージ(段)に分割されていて、先行する処理全体の完了を待たずにステージごとに次の処理を開始する」
@<fn>{bib_fpga_pipeline_def}ような処理のことです。
CPUにおいては、1クロックで1つの命令を実行するのではなく、
例えばIF, ID, EX, MEM, WBといった段階に分割し、複数クロックで実行することによって
パイプライン処理が実現されます。
パイプライン処理で命令を処理すると、
回路のクリティカルパスが短くなることで最大周波数(fMax)が向上し、
命令のスループットが上がることが期待されます。

//footnote[bib_fpga_pipeline_def][FPGAの原理と構成, 天野英晴]

bluecoreでは命令を次の5つのステージで処理します。

 1. IF : 命令をメモリからフェッチする
 2. ID : 命令を解析し、どのように実行するかを求める
 3. EX : 計算する
 4. MEM: ロードストアをおこなう
 5. WB : レジスタに結果をライトバックする

coreモジュールには、各ステージの処理や接続、制御が記述されています。

=== IFステージ (Instruction Fetch Stage)

IFステージは、メモリから命令をフェッチし、フェッチした命令をIDステージに渡します。

@<list>{ifstage.bus}は、メモリバスに対して命令フェッチ要求を送る部分のコードです。
命令フェッチの要求は、IFステージとIDステージの間のFIFOに命令を追加することができる(@<code>{idq_wready_next})
かつ、すでに要求済みの場合(@<code>{if_is_requested})はフェッチ結果が取得できた(@<code>{ibus_if.resp_valid})
という条件を満たしたときにのみ有効になります(@<code>{ibus_if.valid})。
要求するアドレス@<code>{ibus_if.addr}は、@<code>{if_pc}レジスタの値になります。

//list[ifstage.bus][IFステージのメモリバスとの接続(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,ifstage_bus)
    // IFステージ
    var if_pc          : Addr ; // PC
    var if_is_requested: logic; // フェッチ中かどうか
    var if_requested_pc: Addr ; // フェッチ中のPC

    // フェッチ命令
    always_comb {
        ibus_if.valid = idq_wready_next & (!if_is_requested | ibus_if.resp_valid);
        ibus_if.addr  = if_pc;
        ibus_if.wen   = 0;
        ibus_if.wdata = 'x; // 命令フェッチは書き込まない
        ibus_if.wmask = 0;
    }
#@end
//}

//list[ifstage.always][IFステージのレジスタの制御(core.veryl)]{
    always_ff(clk, rst) {
            (省略)
#@maprange(scripts/sec4/core/src/core.veryl,ifstage_ctrl)
            // フラッシュ時の動作
            if flush_before_memstage {
                if_is_requested = 0; // 次のクロックでフェッチ開始する
                if_pc           = if mem_csr_is_trap {
                    mem_csr_trap_vector // トラップ
                } else {
                    mem_next_pc_expected // 分岐ハザード
                };
            } else {
                if ibus_if.ready & ibus_if.valid {
                    if_pc           = if_pc + 4;
                    if_is_requested = 1;
                    if_requested_pc = if_pc;
                } else {
                    if if_is_requested & ibus_if.resp_valid {
                        if_is_requested = 0;
                    }
                }
            }
#@end
//}


@<list>{ifstage.always}は、@<code>{if_pc}レジスタなどを更新するalways_ffブロックです。
IFステージがフラッシュされる(@<code>{flush_before_memstage})とき、
フラッシュの原因に基づいて@<code>{if_pc}レジスタを更新します。
フラッシュの原因は次の2種類があります

 * CSR命令(ecallやmret)によるトラップ
 * 分岐ハザードによるトラップ

IFステージがフラッシュされないときは、命令をフェッチします。
命令をフェッチできるとき、@<code>{if_pc}をインクリメントして、
フェッチを要求したかどうかを@<code>{1}にし、
要求中のアドレスを@<code>{if_pc}(インクリメントされる前の値)に設定します。
命令をフェッチできないとき、すでにフェッチ要求済みでフェッチ結果が取得できた場合は、
フェッチを要求したかどうかを@<code>{0}にします。

CPUがリセットされたとき、プログラムは実行をアドレス0から開始します。

=== IDステージ (Instruction Decode Stage)

IDステージは、IFステージから命令を受け取り、
命令を実行するために必要な情報を生成してEXステージに渡します。
IDステージには、命令のデコード、データハザードの解決の大きく分けて2つの役割があります。

==== 命令のデコード

命令を実行するために必要な情報の生成(デコード処理)は、inst_decode.verylで行っています。
デコード処理では、命令の下位7bit(@<code>{op})をcase文で分岐することによって、
制御用の値(@<code>{ctrl})と即値(@<code>{imm})を生成しています(@<list>{inst_decode.always_comb})。

//list[inst_decode.always_comb][デコード処理の一部(inst_decode.veryl)]{
#@maprange(scripts/sec4/core/src/inst_decode.veryl,decode)
    always_comb {
        case op {
            OP_LUI: {
                        imm  = imm_u;
                        ctrl = {T, InstType::U, T, T, F, F, F, F, F, f3, f7};
                    }
            OP_AUIPC: {
                          imm  = imm_u;
                          ctrl = {T, InstType::U, T, F, F, F, F, F, F, f3, f7};
                      }
#@end
//}

//list[corectrl.instctrl][制御用の値の型の定義(packages/corectrl.veryl)]{
#@maprange(scripts/sec4/core/src/packages/corectrl.veryl,ctrl)
    enum InstType: logic<6> {
        X = 6'b000000,
        R = 6'b000001,
        I = 6'b000010,
        S = 6'b000100,
        B = 6'b001000,
        U = 6'b010000,
        J = 6'b100000,
    }

    struct InstCtrl {
        is_legal : logic      , // 命令が合法である
        insttype : InstType   , // 命令のType
        rf_wen   : logic      , // レジスタに書き込むかどうか
        is_lui   : logic      , // LUI命令である
        is_aluop : logic      , // ALUを利用する命令である
        is_jump  : logic      , // ジャンプ命令である
        is_load  : logic      , // ロード命令である
        is_system: logic      , // CSR命令である
        is_fence : logic      , // フェンス命令である
        funct3   : logic   <3>, // 命令のfunct3フィールド
        funct7   : logic   <7>, // 命令のfunct7フィールド
    }
#@end
//}

@<list>{corectrl.instctrl}は、制御用の値を表す型の定義(@<code>{InstCtrl})です。
IDステージ以降のステージでは、InstCtrlのメンバーの値をみることで命令を実行していきます。
それぞれのメンバーの意味についてはコメントとinst_decodeモジュールを参照してください。

//note[RISC-Vの命令フォーマット]{
TODO
OPの表とType分類
//}

==== データハザードの解決

IDステージでは、EXステージやMEMステージで利用するソースレジスタ(rs1, rs2)の値を解決する処理を行います。

ここにデータハザードを説明するいい感じの図

IDステージにある命令が使用するレジスタが、EX, MEM, WBステージに存在する命令のデスティネーションレジスタ(rd)である場合、
IDステージにある命令は先のステージにある命令の結果に依存しています。
このとき、依存している命令の結果がレジスタに書き込まれるのを待つ(ストールする)必要があります。
しかし、レジスタを介してデータを受け取るのではなく、
依存している命令があるステージから直接データを受け取るようにすることで、
ストールする必要があるサイクル数を減らすことができます。
この手法のことをフォワーディングといいます。

//list[reg_forward][フォワーディングの制御を行う処理(reg_forward.veryl)]{
#@maprange(scripts/sec4/core/src/reg_forward.veryl,reg_hazard)
    let ex_hazard : logic = ex_valid & ex_addr == addr;
    let mem_hazard: logic = mem_valid & mem_addr == addr;
    let wb_hazard : logic = wb_valid & wb_addr == addr;

    always_comb {
        data_hazard = valid & addr != 0 & (if ex_hazard {
            !ex_can_fw
        } else if mem_hazard {
            !mem_can_fw
        } else if wb_hazard {
            !wb_can_fw
        } else {
            0
        });
        result = if addr == 0 {
            0
        } else if ex_hazard {
            ex_data
        } else if mem_hazard {
            mem_data
        } else if wb_hazard {
            wb_data
        } else {
            reg_data
        };
    }
#@end
//}

bluecoreでは、EX, MEM, WBステージからIDステージへのフォワーディングを実装しています。
@<list>{reg_forward}は、フォワーディングの制御を行うreg_forwardモジュールの一部です。
@<code>{data_hazard}は、データハザードが発生して待つ必要があるかどうかを示すワイヤです。
@<code>{data_hazard}は、ソースレジスタのアドレス(@<code>{addr})が0ではなく、
@<code>{addr}とEX, MEM, WBステージのデスティネーションレジスタのアドレスが一致するとき、
一致したステージからフォワーディングができない場合に@<code>{1}になります。
@<code>{result}は、フォワーディングした結果の値のワイヤです。
依存性がある場合は依存性があるステージから提供される値が設定され、
依存性がない場合はレジスタから読みだした値が設定されます。

==== IDステージでライトバックする値が確定する命令

bluecoreでは、LUI命令, 分岐命令, ジャンプ命令のライトバックする値をIDステージで確定させます。
それぞれの命令のライトバックする値は@<table>{idstage_wb_table}のようになります。

//table[idstage_wb_table][IDステージでライトバックする値が確定する命令]{
命令			ライトバックする値
---------------------------------
LUI命令			即値(を12bit左にシフトした値)
分岐命令		PC + 4
ジャンプ命令	PC + 4
//}

@<list>{idstage_wbctx}は、ライトバックする値を確定させる処理です。
EXステージに渡すデータにはライトバックする値を管理する@<code>{wbctx}という構造体が含まれています。
@<code>{valid}にはすでに値が確定したかどうか、
@<code>{addr}にはデスティネーションレジスタのアドレス、
@<code>{data}には確定した値が格納されます。
@<code>{valid}で使用しているinst_is_から始まるfunctionは、
引数に制御用の値(@<code>{InstCtrl})を受け取り、
それが何の命令かを判定する関数です。
これらのfunctionはすべてcorectrlパッケージに記述されています。

//list[idstage_wbctx][IDステージでライトバックする値を確定させる処理(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,idstage_wbctx)
        // LUI, BRANCH, JUMPは、IDステージでライトバックする値が確定する
        exq_wdata.wbctx.valid = inst_is_lui(id_ctrl) | inst_is_branch(id_ctrl) | inst_is_jump(id_ctrl);
        exq_wdata.wbctx.addr  = id_rd_addr;
        exq_wdata.wbctx.data  = if inst_is_lui(id_ctrl) {
            id_imm
        } else {
            idq_rdata.addr + 4
        };
#@end
//}

=== EXステージ (EXecution Stage)

EXステージは、IDステージから制御用の値と演算用の値(ソースレジスタの値や即値)を受け取り、
演算を行うステージです。
演算には、ライトバックする値を求めるための演算、
MEMステージで利用するアドレスを求めるための演算、
分岐が発生するか判定するための演算の3種類があります。
coreモジュールでは演算のためのモジュールとして、alu, alubrをインスタンス化しています(@<list>{exestage_alu})。

//list[exestage_alu][alu, alubrモジュールのインスタンス化(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,exestage_alu)
    inst ex_alu: alu (
        ctrl  : exq_rdata.ctrl,
        op1   : exq_rdata.op1 ,
        op2   : exq_rdata.op2 ,
        result: ex_alu_out    ,
    );

    inst ex_alubr: alubr (
        funct3: exq_rdata.ctrl.funct3,
        op1   : exq_rdata.op1        ,
        op2   : exq_rdata.op2        ,
        take  : ex_br_taken          ,
    );
#@end
//}

==== aluモジュール (alu.veryl)

aluモジュールは、様々な演算を実行した結果を制御用の値に応じて選択するモジュールです。
@<code>{InstCtrl.is_aluop}が@<code>{1}のとき、@<code>{InstCtrl.funct3}の値に応じて
加算や減算、シフトやビット演算などの結果が選択されます。
@<code>{0}のときは、常に加算の結果が選択されます@<fn>{riscv_alu_onlyadd}。

//footnote[riscv_alu_onlyadd][RISC-Vでは、演算した結果を利用して操作を行う命令(例えばロードストア命令)は加算しか利用しません。bluecoreでは、そのような命令のis_aluopを0としています。]

//table[alu_funct3][aluの演算の種類]{
funct3			演算
---------------------------------
3'b000			加算、または減算
3'b001			左シフト
3'b010			符号あり <=
3'b011			符号なし <=
3'b100			ビット単位XOR
3'b101			右(論理|算術)シフト
3'b110			ビット単位OR
3'b111			ビット単位AND
//}

==== alubrモジュール (alubr.veryl)

alubrモジュールは、分岐の成否を判定するための演算を行うモジュールです。
@<code>{InstCtrl.funct3}の値に応じて、@<code>{==}, @<code>{!=}, @<code>{>}, @<code>{>=}などの結果が選択されます。
分岐の成否は@<code>{taken}に割り当てられています。
bluecoreでは分岐によってパイプラインをフラッシュする操作をMEMステージで行うため、
EXステージはMEMステージに分岐の成否を渡します。

//table[alubr_funct3][alubrの演算の種類]{
funct3			演算
---------------------------------
3'b000			==
3'b001			!=
3'b100			符号あり <=
3'b101			符号あり >
3'b110			符号なし <=
3'b111			符号なし >
//}

==== EXステージでライトバックする値が確定する命令

EXステージでは、メモリ命令, CSR命令以外のすべての命令でライトバックする値が確定します。
@<list>{exstage_wbctx}は、EXステージでライトバックする値を確定させる処理です。
@<code>{wbctx.valid}, @<code>{wbctx.data}は、EXステージよりも前で値が確定していた場合には値をそのまま引き継いでいます。
新しくライトバックする値が確定する場合、@<code>{data}にはALUの演算結果(@<code>{ex_alu_out})が格納されます。

//list[exstage_wbctx][EXステージでライトバックする値を確定させる処理(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,exstage_wbctx)
        // メモリ命令, CSR命令以外は、EXEステージでライトバックする値が確定する
        memq_wdata.wbctx.valid = exq_rdata.wbctx.valid | !(inst_is_memory_op(exq_rdata.ctrl) | inst_is_csr_op(exq_rdata.ctrl));
        memq_wdata.wbctx.addr  = exq_rdata.wbctx.addr;
        memq_wdata.wbctx.data  = if exq_rdata.wbctx.valid {
            exq_rdata.wbctx.data
        } else {
            ex_alu_out
        };
#@end
//}

==== EXステージがストールする条件

EXステージの次のMEMステージでは、分岐, ジャンプ命令の次に実行される命令が正しい遷移先のものかどうかを判定しています。
そのためには、分岐, ジャンプ命令の次の命令のアドレスが必要になります。
EXステージは次の命令のアドレスを取得するために、
IDステージに命令が供給されて次の命令のアドレスが判明するまでストールします。

=== MEMステージ (MEMory Stage)

MEMステージは、EXステージから制御用の値と演算結果を受け取って、
ロードストア命令の場合はメモリアクセスを行うステージです。
また、CSR命令の処理や、分岐ハザードを発生させる処理も行います。

==== 分岐, ジャンプの判定

分岐やジャンプ命令の次のPCは、EXステージまで実行しないと分かりません。
しかし、EXステージで次のPCが確定するまで次の命令をフェッチしないでいるのは効率が悪いです。
bluecoreでは、分岐が常に成立しないことを仮定して投機的に命令をフェッチ, 実行します。
ただし、EXステージで分岐の成否が確定してからMEMステージでPCの遷移先を確かめることで、
間違った命令が実行されないようにしています。

本来の遷移先と違う命令がパイプラインに取り込まれてしまっている場合、
EXステージ以前のステージを無効化(フラッシュ)し、新しく命令をフェッチしなおします。
このような状況のことを分岐ハザードといいます。

//list[bh_detect][分岐ハザードの判定(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,bh_detect)
    // 正しい次のPC
    let mem_next_pc_expected: Addr = if !memq_rdata.br_taken {
        memq_rdata.pc_inc
    } else {
        memq_rdata.br_target
    };

    // 分岐ハザードが発生するかどうか
    let mem_is_branch_hazard: logic = memq_rvalid & mem_next_pc_expected != memq_rdata.pc_next;
#@end
//}

@<list>{bh_detect}は、分岐ハザードの判定を行っている部分のコードです。
分岐の成否(@<code>{br_taken})によって、正しい次のPC(@<code>{mem_next_pc_expected})を切り替えています。
分岐が成立しない場合はPCをインクリメントした値(@<code>{pc_inc})、
成立する場合は分岐先のPC(@<code>{br_target})を@<code>{mem_next_pc_expected}に設定しています。
分岐ハザードが発生するかどうか(@<code>{mem_is_branch_target})は、
正しい次のPCが投機的に選択された遷移先と一致しないかどうかによって判定されます。

==== ロードストア命令の処理

ロード命令, ストア命令は、memunitモジュールによって処理されます(@<list>{memstage_inst})。

//list[memstage_inst][memunitモジュールのインスタンス化(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,memstage_inst)
    inst mem_memunit: memunit (
        clk                         ,
        rst                         ,
        dbus_if                     ,
        valid   : memq_rvalid       ,
        is_new  : mem_is_new        ,
        ctrl    : memq_rdata.ctrl   ,
        rs2     : memq_rdata.op     ,
        addr    : memq_rdata.alu_out,
        is_stall: mem_mem_stall     ,
        rdata   : mem_mem_rdata     ,
    );
#@end
//}

memunitモジュールは、coreモジュールの@<code>{dbus_if}インターフェースを介してメモリにアクセスします。
MEMステージに供給された命令がロードストア命令の時、MEMステージをスト―ルし、
状態を@<code>{Init}から@<code>{WaitReady}に移動します。
状態が@<code>{WaitReady}のとき、@<code>{dbus_if}に対してロードかストアを要求します(@<list>{memunit_bus})。
@<code>{dbus_if}が要求を受け付ける(@<code>{dbus_if.ready}が@<code>{1})とき、
状態を@<code>{WaitValid}に移動します。
状態が@<code>{WaitReady}のとき、ロードの結果が返ってくるかストアが完了した(@<code>{dbus_if.resp_valid})ら
状態を@<code>{Init}に移動し、MEMステージのストールを終了します。
MEMステージの状態の遷移は@<list>{memunit_fsm}のように定義されています。

//list[memunit_state][memunitモジュールの状態の定義(memunit.veryl)]{
#@maprange(scripts/sec4/core/src/memunit.veryl,state)
    enum State: logic<2> {
        Init,
        WaitReady,
        WaitValid,
    }
#@end
//}

//list[memunit_fsm][memunitの状態遷移(memunit.veryl)]{
#@maprange(scripts/sec4/core/src/memunit.veryl,fsm)
    always_ff (clk, rst) {
        if_reset {
            state = State::Init;
        } else {
            if valid {
                case state {
                    State::Init: if is_new & is_memcmd {
                                     state = State::WaitReady;
                                 }
                    State::WaitReady: if dbus_if.ready {
                                          state = State::WaitValid;
                                      }
                    State::WaitValid: if dbus_if.resp_valid {
                                          state = State::Init;
                                      }
                    default: {}
                }
            }
        }
    }
#@end
//}

//list[memunit_bus][dbus_ifへの要求(memunit.veryl)]{
#@maprange(scripts/sec4/core/src/memunit.veryl,bus)
    always_comb {
        dbus_if.valid = state == State::WaitReady;
        dbus_if.addr  = req_mem_addr;
        dbus_if.wen   = req_mem_wen;
        dbus_if.wdata = req_mem_wdata;
        dbus_if.wmask = req_mem_wmask;
    }
#@end
//}

@<code>{dbus_if.wen}は、ストアを要求するかどうかです。
ストアのとき@<code>{dbus_if.wmask}のビットが@<code>{1}の部分について、
メモリの値を@<code>{dbus_if.wdata}に置き換えます。
ただし、@<code>{dbus_if.wmask}は1bitに1byte(8bit)が対応していることに注意してください。

ロードストアの幅(byte, half word, word)やロードの符号拡張については、
@<code>{InstCtrl.funct3}で選択しています(@<table>{memunit_f3_3}, @<table>{memunit_f3_21})。

//table[memunit_f3_3][符号拡張の選択]{
funct3[2]		符号拡張の有無
---------------------------------
0				符号拡張しない (LBU, LHU)
1				符号拡張する (LB, LH, LW)
//}

//table[memunit_f3_21][幅の選択]{
funct3[1:0]		幅
---------------------------------
2'b00			byte (SB, LB, LBU)
2'b01			half word (SH, LH, LHU)
2'b10			word (SW, LW)
//}


==== CSRを利用する命令の処理

bluecoreでは、CSRを利用する命令をMEMステージで処理します。
bluecoreが対応しているCSRを利用する命令は、CSRRW(I), CSRRS(I), CSRRC(I), ECALL, MRETの8命令です。
レジスタは、mtvec, mepc, mcauseの3つのみ対応しています。
CSRを利用する命令の処理は、csrunitモジュールで行います(@<list>{csrstage})。

//list[csrstage][csrunitモジュールのインスタンス化(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,csrstage)
    inst mem_csrunit: csrunit (
        clk                               ,
        rst                               ,
        valid      : memq_rvalid          ,
        rdata      : mem_csr_rdata        ,
        raise_trap : mem_csr_is_trap      ,
        trap_vector: mem_csr_trap_vector  ,
        pc         : memq_rdata.addr      ,
        ctrl       : memq_rdata.ctrl      ,
        rd_addr    : memq_rdata.wbctx.addr,
        csr_addr   : memq_rdata.imm[16:5] ,
        rs1        : if inst_is_csr_imm(memq_rdata.ctrl) {
            // uimmを符号拡張する
            {memq_rdata.imm[4] repeat XLEN - 5, memq_rdata.imm[4:0]}
        } else {
            // opにrs1の値が格納されている
            memq_rdata.op
        },
    );
#@end
//}

CSRの値を編集する命令は、命令の上位12bitをCSRのアドレスとして扱います。
この12bitは即値の17から6ビットの範囲(@<code>{imm[16:5]})に格納されています。
即値(uimm)を符号拡張した値を利用する命令(CSRR(W|S|C)I)で利用する即値は、
即値の5から1ビットの範囲(@<code>{imm[4:0]})に格納されています。
この5bitは符号拡張されてcsrunitモジュールに渡されます。

//list[csrunit_ecall][例外の判定(csrunit.veryl)]{
#@maprange(scripts/sec4/core/src/csrunit.veryl,ecall)
    // ECALLのとき、例外を発生させる
    let raise_expt: logic = cmd_is_ecall;
    let cause_expt: UIntX = if cmd_is_ecall {
        CsrCause::ENVIRONMENT_CALL_FROM_U_MODE + {1'b0 repeat XLEN - $bits(mode), mode}
    } else {
        0
    };
#@end
//}

RISC-Vでは、例外、または割り込みが発生するとき、PCと権限レベル(モード)を移動させます。
このことをトラップ(trap)といいます。
RISC-Vには権限が高い順にM, S, Uというモードが用意されており、それぞれ3, 1, 0という数字が対応しています(@<table>{riscv-mode})。

//table[riscv-mode][RISC-Vの権限レベル]{
レベル		名前				名前の略記
---------------------------------
0			User/Application	U
1			Supervisor			S
2			予約済み			
3			Machine				M
//}

bluecoreは、ECALLによるS-modeからM-modeへの例外のみサポートしています。
@<list>{csrunit_ecall}は、例外が発生するかどうかを判定している部分のコードです。
MEMステージにある命令がECALL命令のとき(@<code>{cmd_is_ecall})、
例外が発生する(@<code>{raise_expt})ことにします。
このとき、例外の発生原因(@<code>{cause_expt})を、
@<code>{CsrCause::ENVIRONMENT_CALL_FROM_U_MODE}に現在の実行環境の権限レベル(@<code>{mode})を足したものに設定します。
RISC-Vでは、U-mode, S-mode, M-modeからのECALLによる例外であることを示す数値を、それぞれ8, 9, 11と定義しています。
そのため、ECALLによる例外の理由を示す値は、U-modeからの例外であることを示す8に権限レベルの数値を足したものと等しくなります。

//table[riscv-expt-cause][RISC-Vの例外の原因を示す数値]{
数値		例外の種類
---------------------------------
8			Environment call from U-mode
9			Environment call from S-mode
10			予約済み
11			Environment call from M-mode
//}


bluecoreは、RISC-Vのトラップに関する仕様の一部を実装しています。
csrunitモジュールは例外が発生するとき、次のように動作します。

 * モードをM-modeに設定する
 * mcauseレジスタに、例外の発生原因を格納する
 * mepcレジスタに、例外が発生した命令のPCを格納する
 * PCの遷移先としてmtvecの値をoutputする

MRET命令が実行されるときは、次のように動作します。

 * モードをS-modeに設定する
 * PCの遷移先としてmepcの値をoutputする

CPUの起動(リセット)時の権限レベルはM-modeです。
これをMRET命令を実行することでS-modeに移動し、
ECALL命令を実行することでM-modeに戻ることができます。
MRET命令, ECALL命令の動作は、@<list>{csrunit_always}のように実装されています。

//list[csrunit_always][CSR命令の処理(csrunit.veryl)]{
#@maprange(scripts/sec4/core/src/csrunit.veryl,always)
    always_ff (clk, rst) {
        if_reset {
            mode   = CsrMode::M;
            mcause = 0;
            mepc   = 0;
            mtvec  = 0;
        } else if valid {
            if raise_expt {
                mode   = CsrMode::M;
                mcause = cause_expt;
                mepc   = pc;
            } else {
                if cmd_is_mret {
                    mode = CsrMode::S;
                } else if cmd_is_write {
                    case csr_addr {
                        CsrAddr::MTVEC : mtvec  = wdata;
                        CsrAddr::MEPC  : mepc   = {wdata[XLEN - 1:2], 2'b00};
                        CsrAddr::MCAUSE: mcause = wdata;
                        default        : {}
                    }
                }
            }
        }
    }
#@end
//}

==== MEMステージでライトバックする値が確定する命令

MEMステージでは、ロード命令, CSR命令によるライトバックする値が確定し、
すべての命令のライトバックする値が確定します。
@<list>{memstage_wbctx}は、MEMステージでライトバックする値を確定させる処理です。
@<code>{wbctx.valid}, @<code>{wbctx.data}は、MEMステージよりも前で値が確定していた場合には値をそのまま引き継いでいます。
命令がロード命令のとき、memunitモジュールの出力値(@<code>{mem_mem_rdata})を@<code>{wbctx.data}に設定します。
命令がCSR命令のとき、csrunitモジュールの出力値(@<code>{mem_csr_rdata})を@<code>{wbctx.data}に設定します。

//list[memstage_wbctx][MEMステージでライトバックする値を確定させる処理(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,memstage_wbctx)
        // メモリ命令とCSR命令のライトバックする値を確定する
        wbq_wdata.wbctx.valid = 1;
        wbq_wdata.wbctx.addr  = memq_rdata.wbctx.addr;
        wbq_wdata.wbctx.data  = if memq_rdata.wbctx.valid {
            memq_rdata.wbctx.data
        } else if inst_is_memory_op(memq_rdata.ctrl) {
            mem_mem_rdata
        } else {
            mem_csr_rdata
        };
#@end
//}

=== WBステージ (WriteBack Stage)

WBステージは、MEMステージから制御用の値とライトバックする値を受け取って、
ライトバックする場合はレジスタに値をライトバックするステージです。
WBステージはパイプライン処理の最後のステージであり、WBステージで命令の実行は終了します。

@<list>{wb_proc}は、レジスタに命令の結果を書き込む処理です。
レジスタに値を書き込む命令である(@<code>{InstCtrl.rf_wen})場合、
レジスタ(@<code>{registers})に命令の結果(@<code>{wbctx.data})を書き込みます。

//list[wb_proc][レジスタへのライトバック(core.veryl)]{
#@maprange(scripts/sec4/core/src/core.veryl,wb)
            if wbq_rvalid & wbq_rdata.ctrl.rf_wen {
                registers[wbq_rdata.wbctx.addr] = wbq_rdata.wbctx.data;
            }
#@end
//}

== 命令実行の具体例

=== ADD命令の実行

=== BGE命令の実行

=== LH命令の実行

=== CSRRW命令の実行

== 合成

FPGAに合成する
