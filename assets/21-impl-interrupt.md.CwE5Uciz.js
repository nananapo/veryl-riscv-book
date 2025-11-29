import{_ as a,c as n,o as e,ah as c,bN as l,bO as p,bP as t,bQ as d,bR as o}from"./chunks/framework.BNheOMQd.js";const j=JSON.parse('{"title":"M-modeの実装 (2. 割り込みの実装)","description":"","frontmatter":{},"headers":[],"relativePath":"21-impl-interrupt.md","filePath":"21-impl-interrupt.md"}'),r={name:"21-impl-interrupt.md"};function i(m,s,b,h,f,u){return e(),n("div",null,[...s[0]||(s[0]=[c(`<h1 id="m-modeの実装-2-割り込みの実装" tabindex="-1">M-modeの実装 (2. 割り込みの実装) <a class="header-anchor" href="#m-modeの実装-2-割り込みの実装" aria-label="Permalink to “M-modeの実装 (2. 割り込みの実装)”">​</a></h1><h2 id="概要" tabindex="-1">概要 <a class="header-anchor" href="#概要" aria-label="Permalink to “概要”">​</a></h2><h3 id="割り込みとは何か" tabindex="-1">割り込みとは何か？ <a class="header-anchor" href="#割り込みとは何か" aria-label="Permalink to “割り込みとは何か？”">​</a></h3><p>アプリケーションを記述するとき、キーボードやマウスの入力、時間の経過のようなイベントに起因して何らかのプログラムを実行したいことがあります。 例えばキーボードから入力を得たいとき、ポーリング(Polling)、または割り込み(Interrupt)という手法が利用されます。</p><p>ポーリングとは、定期的に問い合わせを行う方式のことです。 例えばキーボード入力の場合、定期的にキーボードデバイスにアクセスして入力があるかどうかを確かめます。 1秒ごとに入力の有無を確認する場合、キーボードの入力から検知までに最大1秒の遅延が発生します。 確認頻度をあげると遅延を減らせますが、 長時間キーボード入力が無い場合、 入力の有無の確認頻度が上がる分だけ何も入力が無いデバイスに対する確認処理が実行されることになります。 この問題は、CPUからデバイスに問い合わせをする方式では解決できません。</p><p>入力の理想的な確認タイミングは入力が確認できるようになってすぐであるため、 入力があったタイミングでデバイス側からCPUにイベントを通知すればいいです。 これを実現するのが割り込みです。</p><p>割り込みとは、何らかのイベントの通知によって実行中のプログラムを中断し、通知内容を処理する方式のことです。 割り込みを使うと、ポーリングのように無駄にデバイスにアクセスをすることなく、入力の処理が必要な時にだけ実行できます。</p><h3 id="risc-vの割り込み" tabindex="-1">RISC-Vの割り込み <a class="header-anchor" href="#risc-vの割り込み" aria-label="Permalink to “RISC-Vの割り込み”">​</a></h3><p>RISC-Vでは割り込み機能がCSRによって提供されます。 割り込みが発生するとトラップが発生します。 割り込みを発生させるようなイベントは外部割り込み、ソフトウェア割り込み、タイマ割り込みの3つに大別されます。</p><dl><dt>外部割り込み (External Interrupt)</dt><dd> コア外部のデバイスによって発生する割り込み。 複数の外部デバイスの割り込みは割り込みコントローラ(第19章「PLICの実装」)などによって調停(制御)されます。 </dd><dt>ソフトウェア割り込み (Software Interrupt)</dt><dd> CPUで動くソフトウェアが発生させる割り込み。 CSR、もしくはメモリにマップされたレジスタ値の変更によって発生します。 </dd><dt>タイマ割り込み (Timer Interrupt)</dt><dd> タイマ回路(デバイス)によって引き起こされる割り込み。 タイマの設定と時間経過によって発生します。 </dd></dl><p>M-modeだけが実装されたRISC-VのCPUでは、次にような順序で割り込みが提供されます。 他に実装されている特権レベルがある場合については<a href="./22-umode-csr.html">「16.9 割り込み条件の変更」</a>、<a href="./23-smode-csr.html">「17.4 トラップの委譲」</a>で解説します。</p><ol><li>割り込みを発生させるようなイベントがデバイスで発生する</li><li>割り込み原因に対応したmipレジスタのビットが<code>0</code>から<code>1</code>になる</li><li>割り込み原因に対応したmieレジスタのビットが<code>1</code>であることを確認する (<code>0</code>なら割り込みは発生しない)</li><li>mstatus.MIEが<code>1</code>であることを確認する (<code>0</code>なら割り込みは発生しない)</li><li>(割り込み(トラップ)開始)</li><li>mstatus.MPIEにmstatus.MIEを格納する</li><li>mstatus.MIEに<code>0</code>を格納する</li><li>mtvecレジスタの値にジャンプする</li></ol><p>mip(Machine Interrupt Pending)レジスタは、割り込みを発生させるようなイベントが発生したことを通知するMXLENビットのCSRです。 mie(Machine Interrupt Enable)レジスタは割り込みを許可するかを原因ごとに制御するMXLENビットのCSRです。 mstatus.MIEはすべての割り込みを許可するかどうかを制御する1ビットのフィールドです。 mieとmstatus.MIEのことを割り込みイネーブル(許可)レジスタと呼び、 特にmstatus.MIEのようなすべての割り込みを制御するビットのことをグローバル割り込みイネーブルビットと呼びます</p><p>割り込みの発生時にmstatus.MIEを<code>0</code>にすることで、割り込みの処理中に割り込みが発生することを防いでいます。 また、トラップから戻る(MRET命令を実行する)ときは、mstatus.MPIEの値をmstatus.MIEに書き戻すことで割り込みの許可状態を戻します。</p><h3 id="割り込みの優先順位" tabindex="-1">割り込みの優先順位 <a class="header-anchor" href="#割り込みの優先順位" aria-label="Permalink to “割り込みの優先順位”">​</a></h3><p>RISC-Vには外部割り込み、ソフトウェア割り込み、タイマ割り込みがそれぞれM-mode、S-mode向けに用意されています。 それぞれの割り込みには表1のような優先順位が定義されていて、 複数の割り込みを発生させられるときは優先順位が高い割り込みを発生させます。</p><div id="riscv.interrupt-priority" class="table"><p class="caption">表15.1: RISC-Vの割り込みの優先順位</p><table><tr class="hline"><th>cause</th><th>説明</th><th>優先順位</th></tr><tr class="hline"><td>11</td><td>Machine external interrupt</td><td>高い</td></tr><tr class="hline"><td>3</td><td>Machine software Interrupt</td><td></td></tr><tr class="hline"><td>7</td><td>Machine timer interrupt</td><td></td></tr><tr class="hline"><td>9</td><td>Supervisor external interrupt</td><td></td></tr><tr class="hline"><td>1</td><td>Supervisor software interrupt</td><td></td></tr><tr class="hline"><td>5</td><td>Supervisor timer interrupt</td><td>低い</td></tr></table></div><h3 id="割り込みの原因-cause" tabindex="-1">割り込みの原因(cause) <a class="header-anchor" href="#割り込みの原因-cause" aria-label="Permalink to “割り込みの原因(cause)”">​</a></h3><p>それぞれの割り込みには原因を区別するための値(cause)が割り当てられています。 割り込みのcauseのMSBは<code>1</code>です。</p><p><code>CsrCause</code>型に割り込みのcauseを追加します (リスト1)。</p><p><span class="caption">▼リスト15.1: 割り込みの原因の定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0d2cd9f2c41f95e5ff074235285cd4b938e6d25~1..b0d2cd9f2c41f95e5ff074235285cd4b938e6d25#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrCause: UIntX {
    INSTRUCTION_ADDRESS_MISALIGNED = <span class="hljs-number">0</span>,
    ILLEGAL_INSTRUCTION = <span class="hljs-number">2</span>,
    BREAKPOINT = <span class="hljs-number">3</span>,
    LOAD_ADDRESS_MISALIGNED = <span class="hljs-number">4</span>,
    STORE_AMO_ADDRESS_MISALIGNED = <span class="hljs-number">6</span>,
    ENVIRONMENT_CALL_FROM_M_MODE = <span class="hljs-number">11</span>,
    <span class="custom-hl-bold">SUPERVISOR_SOFTWARE_INTERRUPT = <span class="hljs-number">&#39;h8000_0000_0000_0001</span>,</span>
    <span class="custom-hl-bold">MACHINE_SOFTWARE_INTERRUPT = <span class="hljs-number">&#39;h8000_0000_0000_0003</span>,</span>
    <span class="custom-hl-bold">SUPERVISOR_TIMER_INTERRUPT = <span class="hljs-number">&#39;h8000_0000_0000_0005</span>,</span>
    <span class="custom-hl-bold">MACHINE_TIMER_INTERRUPT = <span class="hljs-number">&#39;h8000_0000_0000_0007</span>,</span>
    <span class="custom-hl-bold">SUPERVISOR_EXTERNAL_INTERRUPT = <span class="hljs-number">&#39;h8000_0000_0000_0009</span>,</span>
    <span class="custom-hl-bold">MACHINE_EXTERNAL_INTERRUPT = <span class="hljs-number">&#39;h8000_0000_0000_000b</span>,</span>
}
</code></pre></div><h3 id="aclint-advanced-core-local-interruptor" tabindex="-1">ACLINT (Advanced Core Local Interruptor) <a class="header-anchor" href="#aclint-advanced-core-local-interruptor" aria-label="Permalink to “ACLINT (Advanced Core Local Interruptor)”">​</a></h3><p>RISC-Vにはソフトウェア割り込みとタイマ割り込みを実現するデバイスの仕様であるACLINTが用意されています。 ACLINTは、SiFive社が開発したCLINT(Core-Local Interruptor)デバイスが基になった仕様です。</p><p>ACLINTにはMTIMER、MSWI、SSWIの3つのデバイスが定義されています。 MTIMERデバイスはタイマ割り込み、MSWIとSSWIデバイスはソフトウェア割り込み向けのデバイスで、 それぞれmipレジスタのMTIP、MSIP、SSIPビットに状態を通知します。</p><p><img src="`+l+`" alt="ACLINTのメモリマップ"> 本書ではACLINTを図図1のようなメモリマップで実装します。 本章ではMTIMER、MSWIデバイスを実装し、<a href="./23-smode-csr.html">「17.5 ソフトウェア割り込みの実装 (SSWI)」</a>でSSWIデバイスを実装します。 デバイスの具体的な仕様については後で解説します。</p><p>メモリマップ用の定数をeeiパッケージに記述してください (リスト2)。</p><p><span class="caption">▼リスト15.2: メモリマップ用の定数の定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0d2cd9f2c41f95e5ff074235285cd4b938e6d25~1..b0d2cd9f2c41f95e5ff074235285cd4b938e6d25#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// ACLINT</span>
<span class="hljs-keyword">const</span> MMAP_ACLINT_BEGIN   : Addr = <span class="hljs-number">&#39;h200_0000</span> <span class="hljs-keyword">as</span> Addr;
<span class="hljs-keyword">const</span> MMAP_ACLINT_MSIP    : Addr = <span class="hljs-number">0</span>;
<span class="hljs-keyword">const</span> MMAP_ACLINT_MTIMECMP: Addr = <span class="hljs-number">&#39;h4000</span> <span class="hljs-keyword">as</span> Addr;
<span class="hljs-keyword">const</span> MMAP_ACLINT_MTIME   : Addr = <span class="hljs-number">&#39;h7ff8</span> <span class="hljs-keyword">as</span> Addr;
<span class="hljs-keyword">const</span> MMAP_ACLINT_SETSSIP : Addr = <span class="hljs-number">&#39;h8000</span> <span class="hljs-keyword">as</span> Addr;
<span class="hljs-keyword">const</span> MMAP_ACLINT_END     : Addr = MMAP_ACLINT_BEGIN + <span class="hljs-number">&#39;hbfff</span> <span class="hljs-keyword">as</span> Addr;
</code></pre></div><h2 id="aclintモジュールの作成" tabindex="-1">ACLINTモジュールの作成 <a class="header-anchor" href="#aclintモジュールの作成" aria-label="Permalink to “ACLINTモジュールの作成”">​</a></h2><p>本章では、ACLINTのデバイスをaclint_memoryモジュールに実装します。 aclint_memoryモジュールは割り込みを起こすためにcsrunitモジュールと接続します。</p><h3 id="インターフェースを作成する" tabindex="-1">インターフェースを作成する <a class="header-anchor" href="#インターフェースを作成する" aria-label="Permalink to “インターフェースを作成する”">​</a></h3><p>まず、ACLINTのデバイスとcsrunitモジュールを接続するためのインターフェースを作成します。 <code>src/aclint_if.veryl</code>を作成し、次のように記述します (リスト3)。 インターフェースの中身は各デバイスの実装時に実装します。</p><p><span class="caption">▼リスト15.3: aclint_if.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-4a970aed66e74f1c5e4a4397d31cedb3bb820d7d48d43d55e416807cb192c5ea">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">interface</span> aclint_if {
    <span class="hljs-keyword">modport</span> master {
        <span class="hljs-comment">// TODO</span>
    }
    <span class="hljs-keyword">modport</span> slave {
        ..<span class="hljs-keyword">converse</span>(master)
    }
}
</code></pre></div><h3 id="aclint-memoryモジュールを作成する" tabindex="-1">aclint_memoryモジュールを作成する <a class="header-anchor" href="#aclint-memoryモジュールを作成する" aria-label="Permalink to “aclint_memoryモジュールを作成する”">​</a></h3><p>ACLINTのデバイスを実装するモジュールを作成します。 <code>src/aclint_memory.veryl</code>を作成し、次のように記述します (リスト4)。 まだどのレジスタも実装していません。</p><p><span class="caption">▼リスト15.4: aclint_memory.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> aclint_memory (
    clk   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>            ,
    rst   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>            ,
    membus: <span class="hljs-keyword">modport</span> Membus::slave    ,
    aclint: <span class="hljs-keyword">modport</span> aclint_if::master,
) {
    <span class="hljs-keyword">assign</span> membus.ready = <span class="hljs-number">1</span>;
    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            membus.rvalid = <span class="hljs-number">0</span>;
            membus.rdata  = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            membus.rvalid = membus.valid;
        }
    }
}
</code></pre></div><h3 id="mmio-controllerモジュールにaclintを追加する" tabindex="-1">mmio_controllerモジュールにACLINTを追加する <a class="header-anchor" href="#mmio-controllerモジュールにaclintを追加する" aria-label="Permalink to “mmio_controllerモジュールにACLINTを追加する”">​</a></h3><p>mmio_controllerモジュールにACLINTデバイスを追加して、 aclint_memoryモジュールにアクセスできるようにします。</p><p><code>Device</code>型に<code>ACLINT</code>を追加して、ACLINTのデバイスをアドレスにマップします ( リスト5、 リスト6 )。</p><p><span class="caption">▼リスト15.5: Device型にACLINTを追加する (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> Device {
    UNKNOWN,
    RAM,
    ROM,
    DEBUG,
    <span class="custom-hl-bold">ACLINT,</span>
}
</code></pre></div><p><span class="caption">▼リスト15.6: get_device関数でACLINTの範囲を定義する (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> MMAP_ACLINT_BEGIN &lt;= addr &amp;&amp; addr &lt;= MMAP_ACLINT_END {
    <span class="hljs-keyword">return</span> Device::ACLINT;
}
</code></pre></div><p>ACLINTとのインターフェースを追加し、 reset_all_device_masters関数にインターフェースをリセットするコードを追加します ( リスト7、 リスト8 )。</p><p><span class="caption">▼リスト15.7: ポートにACLINTのインターフェースを追加する (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> mmio_controller (
    clk          : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>         ,
    rst          : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>         ,
    DBG_ADDR     : <span class="hljs-keyword">input</span>   Addr          ,
    req_core     : <span class="hljs-keyword">modport</span> Membus::slave ,
    ram_membus   : <span class="hljs-keyword">modport</span> Membus::master,
    rom_membus   : <span class="hljs-keyword">modport</span> Membus::master,
    dbg_membus   : <span class="hljs-keyword">modport</span> Membus::master,
    <span class="custom-hl-bold">aclint_membus: <span class="hljs-keyword">modport</span> Membus::master,</span>
) {
</code></pre></div><p><span class="caption">▼リスト15.8: インターフェースの要求部分をリセットする (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> reset_all_device_masters () {
    reset_membus_master(ram_membus);
    reset_membus_master(rom_membus);
    reset_membus_master(dbg_membus);
    <span class="custom-hl-bold">reset_membus_master(aclint_membus);</span>
}
</code></pre></div><p><code>ready</code>、<code>rvalid</code>を取得する関数にACLINTを登録します ( リスト9、 リスト10 )。</p><p><span class="caption">▼リスト15.9: get_device_ready関数にACLINTのreadyを追加 (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>Device::ACLINT: <span class="hljs-keyword">return</span> aclint_membus.ready;
</code></pre></div><p><span class="caption">▼リスト15.10: get_device_rvalid関数にACLINTのrvalidを追加 (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>Device::ACLINT: <span class="hljs-keyword">return</span> aclint_membus.rvalid;
</code></pre></div><p>ACLINTの<code>rvalid</code>、<code>rdata</code>を<code>req_core</code>に割り当てます ( リスト11 )。</p><p><span class="caption">▼リスト15.11: ACLINTへのアクセス結果をreqに割り当てる (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>Device::ACLINT: req &lt;&gt; aclint_membus;
</code></pre></div><p>ACLINTのインターフェースに要求を割り当てます ( リスト12 )。</p><p><span class="caption">▼リスト15.12: ACLINTにreqを割り当ててアクセス要求する (mmio_controller.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-eb5f5642a61b8f62a17780d16b47a8273fc236beb095a754ff5288b0d30695c7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>Device::ACLINT: {
    aclint_membus      &lt;&gt; req;
    aclint_membus.addr -= MMAP_ACLINT_BEGIN;
}
</code></pre></div><h3 id="aclintとmmio-controller、csrunitモジュールを接続する" tabindex="-1">ACLINTとmmio_controller、csrunitモジュールを接続する <a class="header-anchor" href="#aclintとmmio-controller、csrunitモジュールを接続する" aria-label="Permalink to “ACLINTとmmio_controller、csrunitモジュールを接続する”">​</a></h3><p>aclint_ifインターフェース(<code>aclint_core_bus</code>)、 aclint_memoryモジュールとmmio_controllerモジュールを接続するインターフェース(<code>aclint_membus</code>)をインスタンス化します ( リスト13、 リスト14 )。</p><p><span class="caption">▼リスト15.13: aclint_ifインターフェースのインスタンス化 (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> aclint_core_bus: aclint_if;
</code></pre></div><p><span class="caption">▼リスト15.14: mmio_controllerモジュールと接続するインターフェースのインスタンス化 (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> aclint_membus  : Membus;
</code></pre></div><p>aclint_memoryモジュールをインスタンス化し、 mmio_controllerモジュールと接続します ( リスト15、 リスト16 )。</p><p><span class="caption">▼リスト15.15: aclint_memoryモジュールをインスタンス化する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> aclintm: aclint_memory (
    clk                    ,
    rst                    ,
    membus: aclint_membus  ,
    aclint: aclint_core_bus,
);
</code></pre></div><p><span class="caption">▼リスト15.16: mmio_controllerモジュールと接続する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> mmioc: mmio_controller (
    clk                           ,
    rst                           ,
    DBG_ADDR     : MMAP_DBG_ADDR  ,
    req_core     : mmio_membus    ,
    ram_membus   : mmio_ram_membus,
    rom_membus   : mmio_rom_membus,
    dbg_membus                    ,
    <span class="custom-hl-bold">aclint_membus                 ,</span>
);
</code></pre></div><p>core、csrunitモジュールにaclint_ifポートを追加し、 csrunitモジュールとaclint_memoryモジュールを接続します ( リスト17、 リスト18、 リスト19、 リスト20 )。</p><p><span class="caption">▼リスト15.17: coreモジュールにACLINTのデバイスとのインターフェースを追加する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> core (
    clk     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>               ,
    rst     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>               ,
    i_membus: <span class="hljs-keyword">modport</span> core_inst_if::master,
    d_membus: <span class="hljs-keyword">modport</span> core_data_if::master,
    led     : <span class="hljs-keyword">output</span>  UIntX               ,
    <span class="custom-hl-bold">aclint  : <span class="hljs-keyword">modport</span> aclint_if::slave    ,</span>
) {
</code></pre></div><p><span class="caption">▼リスト15.18: coreモジュールにaclint_ifインターフェースを接続する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk                      ,
    rst                      ,
    i_membus: i_membus_core  ,
    d_membus: d_membus_core  ,
    led                      ,
    <span class="custom-hl-bold">aclint  : aclint_core_bus,</span>
);
</code></pre></div><p><span class="caption">▼リスト15.19: csrunitモジュールACLINTデバイスとのインターフェースを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    minstret   : <span class="hljs-keyword">input</span>   UInt64              ,
    led        : <span class="hljs-keyword">output</span>  UIntX               ,
    <span class="custom-hl-bold">aclint     : <span class="hljs-keyword">modport</span> aclint_if::slave    ,</span>
) {
</code></pre></div><p><span class="caption">▼リスト15.20: csrunitモジュールのインスタンスにインターフェースを接続する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c8477e60e21792c8f775901c79818ecc8d1409ab~1..c8477e60e21792c8f775901c79818ecc8d1409ab#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    minstret                          ,
    led                               ,
    <span class="custom-hl-bold">aclint                            ,</span>
);
</code></pre></div><h2 id="ソフトウェア割り込みの実装-mswi" tabindex="-1">ソフトウェア割り込みの実装 (MSWI) <a class="header-anchor" href="#ソフトウェア割り込みの実装-mswi" aria-label="Permalink to “ソフトウェア割り込みの実装 (MSWI)”">​</a></h2><p>MSWIデバイスはソフトウェア割り込み(machine software interrupt)を提供するためのデバイスです。 MSWIデバイスにはハードウェアスレッド毎に4バイトのMSIPレジスタが用意されています(表2)。 MSIPレジスタの上位31ビットは読み込み専用の<code>0</code>であり、最下位ビットのみ変更できます。 各MSIPレジスタは、それに対応するハードウェアスレッドのmip.MSIPと接続されています。</p><div id="mswi.map.reg" class="table"><p class="caption">表15.2: MSWIデバイスのメモリマップ</p><table><tr class="hline"><th>オフセット</th><th>レジスタ</th></tr><tr class="hline"><td>0000</td><td>MSIP0</td></tr><tr class="hline"><td>0004</td><td>MSIP1</td></tr><tr class="hline"><td>0008</td><td>MSIP2</td></tr><tr class="hline"><td>..</td><td>..</td></tr><tr class="hline"><td>3ff8</td><td>MSIP4094</td></tr><tr class="hline"><td>3ffc</td><td>予約済み</td></tr></table></div> 仕様上はmhartidとMSIPの後ろの数字(hartID)が一致する必要はありませんが、 本書ではmhartidとhartIDが同じになるように実装します。 他のACLINTのデバイスも同様に実装します。 <h3 id="msipレジスタを実装する" tabindex="-1">MSIPレジスタを実装する <a class="header-anchor" href="#msipレジスタを実装する" aria-label="Permalink to “MSIPレジスタを実装する”">​</a></h3><p><img src="`+p+`" alt="MSIPレジスタ"> ACLINTモジュールにMSIPレジスタを実装します(図2)。 今のところCPUにはmhartidが<code>0</code>のハードウェアスレッドしか存在しないため、MSIP0のみ実装します。</p><p>aclint_ifインターフェースに<code>msip</code>を追加します (リスト21)。</p><p><span class="caption">▼リスト15.21: mispビットをインターフェースに追加する (aclint_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/79f4772e227f0605f0f1f9f9285b31086b1f1768~1..79f4772e227f0605f0f1f9f9285b31086b1f1768#diff-4a970aed66e74f1c5e4a4397d31cedb3bb820d7d48d43d55e416807cb192c5ea">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">interface</span> aclint_if {
    <span class="custom-hl-bold"><span class="hljs-keyword">var</span> msip: <span class="hljs-keyword">logic</span>;</span>
    <span class="hljs-keyword">modport</span> master {
        <span class="custom-hl-bold">msip: <span class="hljs-keyword">output</span>,</span>
    }
    <span class="hljs-keyword">modport</span> slave {
        ..<span class="hljs-keyword">converse</span>(master)
    }
}
</code></pre></div><p>aclint_memoryモジュールに<code>msip0</code>レジスタを作成し、読み書きできるようにします ( リスト22、 リスト23、 リスト24 )。</p><p><span class="caption">▼リスト15.22: msip0レジスタの定義 (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/79f4772e227f0605f0f1f9f9285b31086b1f1768~1..79f4772e227f0605f0f1f9f9285b31086b1f1768#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> msip0: <span class="hljs-keyword">logic</span>;
</code></pre></div><p><span class="caption">▼リスト15.23: msip0レジスタを0でリセットする (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/79f4772e227f0605f0f1f9f9285b31086b1f1768~1..79f4772e227f0605f0f1f9f9285b31086b1f1768#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        membus.rvalid = <span class="hljs-number">0</span>;
        membus.rdata  = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">msip0         = <span class="hljs-number">0</span>;</span>
</code></pre></div><p><span class="caption">▼リスト15.24: msip0レジスタの書き込み、読み込み (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/79f4772e227f0605f0f1f9f9285b31086b1f1768~1..79f4772e227f0605f0f1f9f9285b31086b1f1768#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> membus.valid {
    <span class="hljs-keyword">let</span> addr: Addr = {membus.addr[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">3</span>], <span class="hljs-number">3&#39;b0</span>};
    <span class="hljs-keyword">if</span> membus.wen {
        <span class="hljs-keyword">let</span> M: <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt; = membus.wmask_expand();
        <span class="hljs-keyword">let</span> D: <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt; = membus.wdata &amp; M;
        <span class="hljs-keyword">case</span> addr {
            MMAP_ACLINT_MSIP: msip0 = D[<span class="hljs-number">0</span>] | msip0 &amp; ~M[<span class="hljs-number">0</span>];
            <span class="hljs-keyword">default</span>         : {}
        }
    } <span class="hljs-keyword">else</span> {
        membus.rdata = <span class="hljs-keyword">case</span> addr {
            MMAP_ACLINT_MSIP: {<span class="hljs-number">63&#39;b0</span>, msip0},
            <span class="hljs-keyword">default</span>         : <span class="hljs-number">0</span>,
        };
    }
}
</code></pre></div><p><code>msip0</code>レジスタとインターフェースの<code>msip</code>を接続します ( リスト25 )。</p><p><span class="caption">▼リスト15.25: インターフェースのmsipとmsip0レジスタを接続する (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/79f4772e227f0605f0f1f9f9285b31086b1f1768~1..79f4772e227f0605f0f1f9f9285b31086b1f1768#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    aclint.msip = msip0;
}
</code></pre></div><h3 id="mip、mieレジスタを実装する" tabindex="-1">mip、mieレジスタを実装する <a class="header-anchor" href="#mip、mieレジスタを実装する" aria-label="Permalink to “mip、mieレジスタを実装する”">​</a></h3><p><img src="`+t+'" alt="mipレジスタ"><img src="'+d+`" alt="mieレジスタ"> mipレジスタのMSIPビット、mieレジスタのMSIEビットを実装します。 mie.MSIEはMSIPビットによる割り込み待機を許可するかを制御するビットです。 mip.MSIPとmie.MSIEは同じ位置のビットに配置されています。 mip.MSIPに書き込むことはできません。</p><p>csrunitモジュールにmieレジスタを作成します ( リスト26、 リスト27 )。</p><p><span class="caption">▼リスト15.26: mieレジスタの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> mie     : UIntX ;
</code></pre></div><p><span class="caption">▼リスト15.27: mieレジスタを0でリセットする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if_reset</span> {
    mode     = PrivMode::M;
    mstatus  = <span class="hljs-number">0</span>;
    mtvec    = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">mie      = <span class="hljs-number">0</span>;</span>
    mscratch = <span class="hljs-number">0</span>;
</code></pre></div><p>mipレジスタを作成します。 MSIPビットをMSWIデバイスのMSIP0レジスタと接続し、 それ以外のビットは<code>0</code>に設定します (リスト28)。</p><p><span class="caption">▼リスト15.28: mipレジスタの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mip: UIntX = {
    <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">12</span>, <span class="hljs-comment">// 0, LCOFIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// MEIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// SEIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// MTIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// STIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    aclint.msip, <span class="hljs-comment">// MSIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// SSIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
};
</code></pre></div><p>mie、mipレジスタの値を読み込めるようにします (リスト29)。</p><p><span class="caption">▼リスト15.29: rdataにmip、mieレジスタの値を割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVEC   : mtvec,
<span class="custom-hl-bold">CsrAddr::MIP     : mip,</span>
<span class="custom-hl-bold">CsrAddr::MIE     : mie,</span>
CsrAddr::MCYCLE  : mcycle,
</code></pre></div><p>mieレジスタの書き込みマスクを設定して、MSIEビットを書き込めるようにします ( リスト30、 リスト31、 リスト32 )。 あとでMTIMEデバイスを実装するときにMTIEビットを使うため、 ここでMTIEビットも書き込めるようにしておきます。</p><p><span class="caption">▼リスト15.30: mieレジスタの書き込みマスクの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MIE_WMASK     : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0088</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト15.31: wmaskに書き込みマスクを設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVEC   : MTVEC_WMASK,
<span class="custom-hl-bold">CsrAddr::MIE     : MIE_WMASK,</span>
CsrAddr::MSCRATCH: MSCRATCH_WMASK,
</code></pre></div><p><span class="caption">▼リスト15.32: mieレジスタの書き込み (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/73624c402c20e4ff3aa2b0049798d5856697d3ab~1..73624c402c20e4ff3aa2b0049798d5856697d3ab#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> is_wsc {
    <span class="hljs-keyword">case</span> csr_addr {
        CsrAddr::MSTATUS : mstatus  = wdata;
        CsrAddr::MTVEC   : mtvec    = wdata;
        <span class="custom-hl-bold">CsrAddr::MIE     : mie      = wdata;</span>
        CsrAddr::MSCRATCH: mscratch = wdata;
</code></pre></div><h3 id="mstatusのmie、mpieビットを実装する" tabindex="-1">mstatusのMIE、MPIEビットを実装する <a class="header-anchor" href="#mstatusのmie、mpieビットを実装する" aria-label="Permalink to “mstatusのMIE、MPIEビットを実装する”">​</a></h3><p>mstatus.MIE、MPIEを変更できるようにします ( リスト33、 リスト34 )。</p><p><span class="caption">▼リスト15.33: 書き込みマスクを変更する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5a3687486b3b603c222d918514c23781a74656d0~1..5a3687486b3b603c222d918514c23781a74656d0#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MSTATUS_WMASK : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0088</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト15.34: レジスタの場所を変数に割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5a3687486b3b603c222d918514c23781a74656d0~1..5a3687486b3b603c222d918514c23781a74656d0#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// mstatus bits</span>
<span class="hljs-keyword">let</span> mstatus_mpie: <span class="hljs-keyword">logic</span> = mstatus[<span class="hljs-number">7</span>];
<span class="hljs-keyword">let</span> mstatus_mie : <span class="hljs-keyword">logic</span> = mstatus[<span class="hljs-number">3</span>];
</code></pre></div><p>トラップが発生するとき、mstatus.MPIEにmstatus.MIE、mstatus.MIEに<code>0</code>を設定します ( リスト35 )。 また、MRET命令でmstatus.MIEにmstatus.MPIE、mstatus.MPIEに<code>1</code>を設定します。</p><p><span class="caption">▼リスト15.35: トラップ、MRET命令の動作の実装 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5a3687486b3b603c222d918514c23781a74656d0~1..5a3687486b3b603c222d918514c23781a74656d0#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> raise_trap {
    <span class="hljs-keyword">if</span> raise_expt {
        mepc   = pc;
        mcause = trap_cause;
        mtval  = expt_value;
        <span class="custom-hl-bold"><span class="hljs-comment">// save mstatus.mie to mstatus.mpie</span></span>
        <span class="custom-hl-bold"><span class="hljs-comment">// and set mstatus.mie = 0</span></span>
        <span class="custom-hl-bold">mstatus[<span class="hljs-number">7</span>] = mstatus[<span class="hljs-number">3</span>];</span>
        <span class="custom-hl-bold">mstatus[<span class="hljs-number">3</span>] = <span class="hljs-number">0</span>;</span>
    } <span class="custom-hl-bold"><span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> trap_return {</span>
        <span class="custom-hl-bold"><span class="hljs-comment">// set mstatus.mie = mstatus.mpie</span></span>
        <span class="custom-hl-bold"><span class="hljs-comment">//     mstatus.mpie = 1</span></span>
        <span class="custom-hl-bold">mstatus[<span class="hljs-number">3</span>] = mstatus[<span class="hljs-number">7</span>];</span>
        <span class="custom-hl-bold">mstatus[<span class="hljs-number">7</span>] = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">}</span>
</code></pre></div><p>これによりトラップで割り込みを無効化して、 トラップから戻るときにmstatus.MIEを元に戻す、 という動作が実現されます。</p><h3 id="割り込み処理の実装" tabindex="-1">割り込み処理の実装 <a class="header-anchor" href="#割り込み処理の実装" aria-label="Permalink to “割り込み処理の実装”">​</a></h3><p>必要なレジスタを実装できたので、割り込みを起こす処理を実装します。 割り込みはmip、mieの両方のビット、mstatus.MIEビットが立っているときに発生します。</p><h4 id="割り込みのタイミング" tabindex="-1">割り込みのタイミング <a class="header-anchor" href="#割り込みのタイミング" aria-label="Permalink to “割り込みのタイミング”">​</a></h4><p>割り込みでトラップを発生させるとき、 トラップが発生した時点の命令のアドレスが必要なため、 csrunitモジュールに有効な命令が供給されている必要があります。</p><p>割り込みが発生したときにcsrunitモジュールに供給されていた命令は実行されません。 ここで、割り込みを起こすタイミングに注意が必要です。 今のところ、CSRの処理はMEMステージと同時に行っているため、 例えばストア命令をmemunitモジュールで実行している途中に割り込みを発生させてしまうと、 ストア命令の結果がメモリに反映されるにもかかわらず、 mepcレジスタにストア命令のアドレスを書き込んでしまいます。</p><p>それならば、単純に次の命令のアドレスをmepcレジスタに格納するようにすればいいと思うかもしれませんが、 そもそも実行中のストア命令が本来は最終的に例外を発生させるものかもしれません。</p><p>本章ではこの問題に対処するために、 割り込みはMEM(CSR)ステージに新しく命令が供給されたクロックでしか起こせなくして、 トラップが発生するならばmemunitモジュールを無効化します。</p><p>割り込みを発生させられるかを示すフラグ(<code>can_intr</code>)をcsrunitモジュールに定義し、 <code>mems_is_new</code>フラグを割り当てます ( リスト36、 リスト37 )。</p><p><span class="caption">▼リスト15.36: csrunitモジュールにcan_intrを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>rs1_data   : <span class="hljs-keyword">input</span>   UIntX               ,
<span class="custom-hl-bold">can_intr   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>               ,</span>
rdata      : <span class="hljs-keyword">output</span>  UIntX               ,
</code></pre></div><p><span class="caption">▼リスト15.37: mem_is_newをcan_intrに割り当てる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>rs1_data   : memq_rdata.rs1_data  ,
<span class="custom-hl-bold">can_intr   : mems_is_new          ,</span>
rdata      : csru_rdata           ,
</code></pre></div><p>トラップが発生するときにmemunitモジュールを無効にします ( リスト38 )。 今まではEXステージまでに例外が発生することが分かっていたら無効にしていましたが、 csrunitモジュールからトラップが発生するかどうかの情報を直接得るようにします。</p><p><span class="caption">▼リスト15.38: validの条件を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> memu: memunit (
    clk                                   ,
    rst                                   ,
    valid : mems_valid &amp;&amp; !<span class="custom-hl-bold">csru_raise_trap</span>,
</code></pre></div><h4 id="割り込みの判定" tabindex="-1">割り込みの判定 <a class="header-anchor" href="#割り込みの判定" aria-label="Permalink to “割り込みの判定”">​</a></h4><p>割り込みを起こすかどうか(<code>raise_intrrupt</code>)、 割り込みのcause(<code>intrrupt_cause</code>)、 トラップベクタ(<code>interrupt_vector</code>)を示す変数を作成します (リスト39)。</p><p><span class="caption">▼リスト15.39: 割り込みを判定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Interrupt</span>
<span class="hljs-keyword">let</span> raise_interrupt : <span class="hljs-keyword">logic</span> = valid &amp;&amp; can_intr &amp;&amp; mstatus_mie &amp;&amp; (mip &amp; mie) != <span class="hljs-number">0</span>;
<span class="hljs-keyword">let</span> interrupt_cause : UIntX = CsrCause::MACHINE_SOFTWARE_INTERRUPT;
<span class="hljs-keyword">let</span> interrupt_vector: Addr  = mtvec;
</code></pre></div><p>トラップ情報の変数に、割り込みの情報を割り当てます (リスト40)。 本書では例外を優先します。</p><p><span class="caption">▼リスト15.40: トラップを制御する変数に割り込みの値を割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> raise_trap = raise_expt || <span class="custom-hl-bold">raise_interrupt ||</span> trap_return;
<span class="hljs-keyword">let</span> trap_cause: UIntX = <span class="custom-hl-bold"><span class="hljs-keyword">switch</span> {</span>
<span class="custom-hl-bold">    raise_expt     : expt_cause,</span>
<span class="custom-hl-bold">    raise_interrupt: interrupt_cause,</span>
<span class="custom-hl-bold">    <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,</span>
<span class="custom-hl-bold">};</span>
<span class="hljs-keyword">assign</span> trap_vector = <span class="custom-hl-bold"><span class="hljs-keyword">switch</span> {</span>
<span class="custom-hl-bold">    raise_expt     : mtvec,</span>
<span class="custom-hl-bold">    raise_interrupt: interrupt_vector,</span>
<span class="custom-hl-bold">    trap_return    : mepc,</span>
<span class="custom-hl-bold">    <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,</span>
<span class="custom-hl-bold">};</span>
</code></pre></div><p>割り込みの時にMRET命令の判定が<code>0</code>になるようにします (リスト41)。</p><p><span class="caption">▼リスト15.41: 割り込みが発生するとき、trap_returnを0にする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Trap Return</span>
<span class="hljs-keyword">assign</span> trap_return = valid &amp;&amp; is_mret &amp;&amp; !raise_expt <span class="custom-hl-bold">&amp;&amp; !raise_interrupt</span>;
</code></pre></div><p>トラップが発生するとき、 例外のときはmtvalレジスタに例外に固有の情報、割り込みの時は<code>0</code>が書き込まれます。</p><p>割り込みの時に各CSR、mtvalレジスタの値が設定されるようにします (リスト42)。</p><p><span class="caption">▼リスト15.42: 例外が発生したときにのみmtvalレジスタに書き込む (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/82fab4c4c3fb8aba9588aa89b978f35d8075f824~1..82fab4c4c3fb8aba9588aa89b978f35d8075f824#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> raise_trap {
    <span class="hljs-keyword">if</span> raise_expt <span class="custom-hl-bold">|| raise_interrupt</span> {
        mepc   = pc;
        mcause = trap_cause;
        mtval  = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_expt ?</span> expt_value <span class="custom-hl-bold">: <span class="hljs-number">0</span></span>;
</code></pre></div><h3 id="ソフトウェア割り込みをテストする" tabindex="-1">ソフトウェア割り込みをテストする <a class="header-anchor" href="#ソフトウェア割り込みをテストする" aria-label="Permalink to “ソフトウェア割り込みをテストする”">​</a></h3><p>ソフトウェア割り込みが正しく動くことを確認します。</p><p><code>test/mswi.c</code>を作成し、次のように記述します (リスト43)。</p><p><span class="caption">▼リスト15.43: test/mswi.c</span> <a href="https://github.com/nananapo/bluecore/compare/1268de0df31a42b5118ac8611a8b62f6006f52b3~1..1268de0df31a42b5118ac8611a8b62f6006f52b3#diff-9fbae77e0250284e72add26b99c83e8a207a1ce4820973c9f118cd6598ef1e9a">差分をみる</a></p><div class="language-c"><button title="Copy Code" class="copy"></button><span class="lang">c</span><pre class="hljs"><code><span class="hljs-meta">#<span class="hljs-keyword">define</span> MSIP0 ((volatile unsigned int *)0x2000000)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> DEBUG_REG ((volatile unsigned long long*)0x40000000)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> MIE_MSIE (1 &lt;&lt; 3)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> MSTATUS_MIE (1 &lt;&lt; 3)</span>

<span class="hljs-type">void</span> <span class="hljs-title function_">interrupt_handler</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span>;

<span class="hljs-type">void</span> <span class="hljs-title function_">w_mtvec</span><span class="hljs-params">(<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> x)</span> {
    <span class="hljs-keyword">asm</span> <span class="hljs-title function_">volatile</span><span class="hljs-params">(<span class="hljs-string">&quot;csrw mtvec, %0&quot;</span> : : <span class="hljs-string">&quot;r&quot;</span> (x))</span>;
}

<span class="hljs-type">void</span> <span class="hljs-title function_">w_mie</span><span class="hljs-params">(<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> x)</span> {
    <span class="hljs-keyword">asm</span> <span class="hljs-title function_">volatile</span><span class="hljs-params">(<span class="hljs-string">&quot;csrw mie, %0&quot;</span> : : <span class="hljs-string">&quot;r&quot;</span> (x))</span>;
}

<span class="hljs-type">void</span> <span class="hljs-title function_">w_mstatus</span><span class="hljs-params">(<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> x)</span> {
    <span class="hljs-keyword">asm</span> <span class="hljs-title function_">volatile</span><span class="hljs-params">(<span class="hljs-string">&quot;csrw mstatus, %0&quot;</span> : : <span class="hljs-string">&quot;r&quot;</span> (x))</span>;
}

<span class="hljs-type">void</span> <span class="hljs-title function_">main</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span> {
    w_mtvec((<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span>)interrupt_handler);
    w_mie(MIE_MSIE);
    w_mstatus(MSTATUS_MIE);
    *MSIP0 = <span class="hljs-number">1</span>;
    <span class="hljs-keyword">while</span> (<span class="hljs-number">1</span>) *DEBUG_REG = <span class="hljs-number">3</span>; <span class="hljs-comment">// fail</span>
}

<span class="hljs-type">void</span> <span class="hljs-title function_">interrupt_handler</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span> {
    *DEBUG_REG = <span class="hljs-number">1</span>; <span class="hljs-comment">// success</span>
}
</code></pre></div><p>プログラムでは、 mtvecにinterrupt_handler関数のアドレスを書き込み、 mstatus.MIE、mie.MSIEを<code>1</code>に設定して割り込みを許可してから MSIP0レジスタに1を書き込んでいます。</p><p>プログラムをコンパイルして実行<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>すると、 ソフトウェア割り込みが発生することでinterrupt_handlerにジャンプし、 デバッグ用のデバイスに<code>1</code>を書き込んで終了することを確認できます。</p><h2 id="mtvecのvectoredモードの実装" tabindex="-1">mtvecのVectoredモードの実装 <a class="header-anchor" href="#mtvecのvectoredモードの実装" aria-label="Permalink to “mtvecのVectoredモードの実装”">​</a></h2><p><img src="`+o+`" alt="mtvecレジスタ"> mtvecレジスタにはMODEフィールドがあり、 割り込みが発生するときのジャンプ先の決定方法を制御できます(図5)。</p><p>MODEがDirect(<code>2&#39;b00</code>)のとき、<code>mtvec.BASE &lt;&lt; 2</code>のアドレスにトラップします。 Vectored(<code>2&#39;b01</code>)のとき、<code>(mtvec.BASE &lt;&lt; 2) + 4 * cause</code>のアドレスにトラップします。 ここでcauseは割り込みのcauseのMSBを除いた値です。 例えばmachine software interruptの場合、<code>(mtvec.BASE &lt;&lt; 2) + 4 * 3</code>がジャンプ先になります。</p><p>例外のトラップベクタは、常にMODEがDirectとして計算します。</p><p>下位1ビットに書き込めるようにすることで、 mtvec.MODEにVectoredを書き込めるようにします (リスト44)。</p><p><span class="caption">▼リスト15.44: 書き込みマスクを変更する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ee042312bb196117be9575fb1e0abe611bb475a8~1..ee042312bb196117be9575fb1e0abe611bb475a8#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MTVEC_WMASK   : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_fff</span><span class="custom-hl-bold">d</span>;
</code></pre></div><p>割り込みのトラップベクタをMODEとcauseに応じて変更します (リスト45)。</p><p><span class="caption">▼リスト15.45: 割り込みのトラップベクタを求める (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ee042312bb196117be9575fb1e0abe611bb475a8~1..ee042312bb196117be9575fb1e0abe611bb475a8#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> interrupt_vector: Addr  = <span class="hljs-keyword">if</span> mtvec[<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> ? {mtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>], <span class="hljs-number">2&#39;b0</span>} : <span class="hljs-comment">// Direct</span>
 {mtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>] + interrupt_cause[<span class="hljs-keyword">msb</span> - <span class="hljs-number">2</span>:<span class="hljs-number">0</span>], <span class="hljs-number">2&#39;b0</span>}; <span class="hljs-comment">// Vectored</span>
</code></pre></div><p>例外のトラップベクタを、mtvecレジスタの下位2ビットを<code>0</code>にしたアドレス(Direct)に変更します ( リスト46、 リスト47 )。 新しく<code>expt_vector</code>を定義し、<code>trap_vector</code>に割り当てます。</p><p><span class="caption">▼リスト15.46: 例外のトラップベクタ (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ee042312bb196117be9575fb1e0abe611bb475a8~1..ee042312bb196117be9575fb1e0abe611bb475a8#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_vector: Addr = {mtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>], <span class="hljs-number">2&#39;b0</span>};
</code></pre></div><p><span class="caption">▼リスト15.47: expt_vectorをtrap_vectorに割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ee042312bb196117be9575fb1e0abe611bb475a8~1..ee042312bb196117be9575fb1e0abe611bb475a8#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> trap_vector = <span class="hljs-keyword">switch</span> {
    raise_expt     : <span class="custom-hl-bold">expt_vector</span>,
    raise_interrupt: interrupt_vector,
    trap_return    : mepc,
    <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,
};
</code></pre></div><h2 id="タイマ割り込みの実装-mtimer" tabindex="-1">タイマ割り込みの実装 (MTIMER) <a class="header-anchor" href="#タイマ割り込みの実装-mtimer" aria-label="Permalink to “タイマ割り込みの実装 (MTIMER)”">​</a></h2><h3 id="タイマ割り込み" tabindex="-1">タイマ割り込み <a class="header-anchor" href="#タイマ割り込み" aria-label="Permalink to “タイマ割り込み”">​</a></h3><p>MTIMERデバイスは、タイマ割り込み(machine timer interrupt)を提供するためのデバイスです。 MTIMERデバイスには1つの8バイトのMTIMEレジスタ、 ハードウェアスレッド毎に8バイトのMTIMECMPレジスタが用意されています。 本書ではMTIMECMPの後ろにMTIMEを配置します(表3)。</p><div id="mtimer.map.reg" class="table"><p class="caption">表15.3: 本書のMTIMERデバイスのメモリマップ</p><table><tr class="hline"><th>オフセット</th><th>レジスタ</th></tr><tr class="hline"><td>0000</td><td>MTIMECMP0</td></tr><tr class="hline"><td>0008</td><td>MTIMECMP1</td></tr><tr class="hline"><td>..</td><td>..</td></tr><tr class="hline"><td>7ff0</td><td>MTIMECMP4094</td></tr><tr class="hline"><td>7ff8</td><td>MTIME</td></tr></table></div> MTIMEレジスタは、固定された周波数でのクロックサイクル毎にインクリメントするレジスタです。 リセット時に\`0\`になります。 <p>MTIMERデバイスは、それに対応するハードウェアスレッドのmip.MTIPと接続されており、 MTIMEがMTIMECMPを上回ったときmip.MTIPを<code>1</code>にします。 これにより、指定した時間に割り込みを発生させることが可能になります。</p><h3 id="mtime、mtimecmpレジスタを実装する" tabindex="-1">MTIME、MTIMECMPレジスタを実装する <a class="header-anchor" href="#mtime、mtimecmpレジスタを実装する" aria-label="Permalink to “MTIME、MTIMECMPレジスタを実装する”">​</a></h3><p>ACLINTモジュールにMTIME、MTIMECMPレジスタを実装します。 今のところmhartidが<code>0</code>のハードウェアスレッドしか存在しないため、MTIMECMP0のみ実装します。</p><p><code>mtime</code>、<code>mtimecmp0</code>レジスタを作成し、読み書きできるようにします ( リスト48、 リスト49、 リスト50 )。 <code>mtime</code>レジスタはクロック毎にインクリメントします。</p><p><span class="caption">▼リスト15.48: mtime、mtimecmpレジスタの定義 (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> msip0    : <span class="hljs-keyword">logic</span> ;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> mtime    : UInt64;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> mtimecmp0: UInt64;</span>
</code></pre></div><p><span class="caption">▼リスト15.49: レジスタを0でリセットする (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        membus.rvalid = <span class="hljs-number">0</span>;
        membus.rdata  = <span class="hljs-number">0</span>;
        msip0         = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">mtime         = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">mtimecmp0     = <span class="hljs-number">0</span>;</span>
</code></pre></div><p><span class="caption">▼リスト15.50: mtime、mtimecmpの書き込み、読み込み (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> membus.wen {
    <span class="hljs-keyword">let</span> M: <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt; = membus.wmask_expand();
    <span class="hljs-keyword">let</span> D: <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt; = membus.wdata &amp; M;
    <span class="hljs-keyword">case</span> addr {
        MMAP_ACLINT_MSIP    : msip0     = D[<span class="hljs-number">0</span>] | msip0 &amp; ~M[<span class="hljs-number">0</span>];
        <span class="custom-hl-bold">MMAP_ACLINT_MTIME   : mtime     = D | mtime &amp; ~M;</span>
        <span class="custom-hl-bold">MMAP_ACLINT_MTIMECMP: mtimecmp0 = D | mtimecmp0 &amp; ~M;</span>
        <span class="hljs-keyword">default</span>             : {}
    }
} <span class="hljs-keyword">else</span> {
    membus.rdata = <span class="hljs-keyword">case</span> addr {
        MMAP_ACLINT_MSIP    : {<span class="hljs-number">63&#39;b0</span>, msip0},
        <span class="custom-hl-bold">MMAP_ACLINT_MTIME   : mtime,</span>
        <span class="custom-hl-bold">MMAP_ACLINT_MTIMECMP: mtimecmp0,</span>
        <span class="hljs-keyword">default</span>             : <span class="hljs-number">0</span>,
    };
}
</code></pre></div><p>aclint_ifインターフェースに<code>mtip</code>を作成し、タイマ割り込みが発生する条件を設定します ( リスト51、 リスト52 )。</p><p><span class="caption">▼リスト15.51: mtipをインターフェースに追加する (aclint_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-4a970aed66e74f1c5e4a4397d31cedb3bb820d7d48d43d55e416807cb192c5ea">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> msip: <span class="hljs-keyword">logic</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> mtip: <span class="hljs-keyword">logic</span>;</span>
<span class="hljs-keyword">modport</span> master {
    msip: <span class="hljs-keyword">output</span>,
    <span class="custom-hl-bold">mtip: <span class="hljs-keyword">output</span>,</span>
}
</code></pre></div><p><span class="caption">▼リスト15.52: mtipにタイマ割り込みが発生する条件を設定する (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    aclint.msip = msip0;
    <span class="custom-hl-bold">aclint.mtip = mtime &gt;= mtimecmp0;</span>
}
</code></pre></div><h3 id="mip-mtip、割り込み原因を設定する" tabindex="-1">mip.MTIP、割り込み原因を設定する <a class="header-anchor" href="#mip-mtip、割り込み原因を設定する" aria-label="Permalink to “mip.MTIP、割り込み原因を設定する”">​</a></h3><p>mipレジスタのMTIPビットにaclint_ifインターフェースの<code>mtip</code>を接続します (リスト53)。</p><p><span class="caption">▼リスト15.53: mip.MTIPにインターフェースのmtipを割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mip: UIntX = {
    <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">12</span>, <span class="hljs-comment">// 0, LCOFIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// MEIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// SEIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="custom-hl-bold">aclint.mtip</span>, <span class="hljs-comment">// MTIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// STIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    aclint.msip, <span class="hljs-comment">// MSIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// SSIP</span>
    <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// 0</span>
};
</code></pre></div><p>割り込み原因を優先順位に応じて設定します。 タイマ割り込みはソフトウェア割り込みよりも優先順位が低いため、 ソフトウェア割り込みの下で原因を設定します (リスト54)。</p><p><span class="caption">▼リスト15.54: タイマ割り込みのcauseを設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> interrupt_pending: UIntX = mip &amp; mie;</span>
<span class="hljs-keyword">let</span> raise_interrupt  : <span class="hljs-keyword">logic</span> = valid &amp;&amp; can_intr &amp;&amp; mstatus_mie &amp;&amp; <span class="custom-hl-bold">interrupt_pending != <span class="hljs-number">0</span></span>;
<span class="hljs-keyword">let</span> interrupt_cause  : <span class="custom-hl-bold">UIntX = <span class="hljs-keyword">switch</span> {</span>
    <span class="custom-hl-bold">interrupt_pending[<span class="hljs-number">3</span>]:</span> CsrCause::MACHINE_SOFTWARE_INTERRUPT<span class="custom-hl-bold">,</span>
    <span class="custom-hl-bold">interrupt_pending[<span class="hljs-number">7</span>]: CsrCause::MACHINE_TIMER_INTERRUPT,</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">default</span>             : <span class="hljs-number">0</span>,</span>
<span class="custom-hl-bold">}</span>;
<span class="hljs-keyword">let</span> interrupt_vector: Addr = <span class="hljs-keyword">if</span> mtvec[<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> ? {mtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>], <span class="hljs-number">2&#39;b0</span>} : <span class="hljs-comment">// Direct</span>
 {mtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>] + interrupt_cause[<span class="hljs-keyword">msb</span> - <span class="hljs-number">2</span>:<span class="hljs-number">0</span>], <span class="hljs-number">2&#39;b0</span>}; <span class="hljs-comment">// Vectored</span>
</code></pre></div><h3 id="タイマ割り込みをテストする" tabindex="-1">タイマ割り込みをテストする <a class="header-anchor" href="#タイマ割り込みをテストする" aria-label="Permalink to “タイマ割り込みをテストする”">​</a></h3><p>タイマ割り込みが正しく動くことを確認します。</p><p><code>test/mtime.c</code>を作成し、次のように記述します (リスト55)。</p><p><span class="caption">▼リスト15.55: test/mtime.c</span> <a href="https://github.com/nananapo/bluecore/compare/2c45155aff4db02a88cd32ed833201514c03083d~1..2c45155aff4db02a88cd32ed833201514c03083d#diff-51e5931e4add42d3d196cef575ec0a2b90e4368c506cd7e1e5c8b8e7f9dcc09f">差分をみる</a></p><div class="language-c"><button title="Copy Code" class="copy"></button><span class="lang">c</span><pre class="hljs"><code><span class="hljs-meta">#<span class="hljs-keyword">define</span> MTIMECMP0 ((volatile unsigned int *)0x2004000)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> MTIME     ((volatile unsigned int *)0x2007ff8)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> DEBUG_REG ((volatile unsigned long long*)0x40000000)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> MIE_MTIE (1 &lt;&lt; 7)</span>
<span class="hljs-meta">#<span class="hljs-keyword">define</span> MSTATUS_MIE (1 &lt;&lt; 3)</span>

<span class="hljs-type">void</span> <span class="hljs-title function_">interrupt_handler</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span>;

<span class="hljs-type">void</span> <span class="hljs-title function_">w_mtvec</span><span class="hljs-params">(<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> x)</span> {
    <span class="hljs-keyword">asm</span> <span class="hljs-title function_">volatile</span><span class="hljs-params">(<span class="hljs-string">&quot;csrw mtvec, %0&quot;</span> : : <span class="hljs-string">&quot;r&quot;</span> (x))</span>;
}

<span class="hljs-type">void</span> <span class="hljs-title function_">w_mie</span><span class="hljs-params">(<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> x)</span> {
    <span class="hljs-keyword">asm</span> <span class="hljs-title function_">volatile</span><span class="hljs-params">(<span class="hljs-string">&quot;csrw mie, %0&quot;</span> : : <span class="hljs-string">&quot;r&quot;</span> (x))</span>;
}

<span class="hljs-type">void</span> <span class="hljs-title function_">w_mstatus</span><span class="hljs-params">(<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> x)</span> {
    <span class="hljs-keyword">asm</span> <span class="hljs-title function_">volatile</span><span class="hljs-params">(<span class="hljs-string">&quot;csrw mstatus, %0&quot;</span> : : <span class="hljs-string">&quot;r&quot;</span> (x))</span>;
}

<span class="hljs-type">void</span> <span class="hljs-title function_">main</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span> {
    w_mtvec((<span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span>)interrupt_handler);
    *MTIMECMP0 = *MTIME + <span class="hljs-number">1000000</span>; <span class="hljs-comment">// この数値は適当に調整する</span>
    w_mie(MIE_MTIE);
    w_mstatus(MSTATUS_MIE);
    <span class="hljs-keyword">while</span> (<span class="hljs-number">1</span>);
    *DEBUG_REG = <span class="hljs-number">3</span>; <span class="hljs-comment">// fail</span>
}

<span class="hljs-type">void</span> <span class="hljs-title function_">interrupt_handler</span><span class="hljs-params">(<span class="hljs-type">void</span>)</span> {
    *DEBUG_REG = <span class="hljs-number">1</span>; <span class="hljs-comment">// success</span>
}
</code></pre></div><p>プログラムでは、 mtvecにinterrupt_handler関数のアドレスを設定し、 mtimeに<code>10000000</code>を足した値をmtimecmp0に設定した後、 mstatus.MIE、mie.MTIEを<code>1</code>に設定して割り込みを許可しています。 タイマ割り込みが発生するまでwhile文で無限ループします。</p><p>プログラムをコンパイルして実行すると、 時間経過によってmain関数からinterrupt_handler関数にトラップしてテストが終了します。 mtimecmp0に設定する値を変えることで、 タイマ割り込みが発生するまでの時間が変わることを確認してください。</p><h2 id="wfi命令の実装" tabindex="-1">WFI命令の実装 <a class="header-anchor" href="#wfi命令の実装" aria-label="Permalink to “WFI命令の実装”">​</a></h2><p>WFI命令は、割り込みが発生するまでCPUをストールさせる命令です。 ただし、グローバル割り込みイネーブルビットは考慮せず、 ある割り込みの待機(pending)ビットと許可(enable)ビットの両方が立っているときに実行を再開します。 また、それ以外の自由な理由で実行を再開させてもいいです。 WFI命令で割り込みが発生するとき、WFI命令の次のアドレスの命令で割り込みが起こったことになります。</p><p>本書ではWFI命令を何もしない命令として実装します。</p><p>inst_decoderモジュールでWFI命令をデコードできるようにします (リスト56)。</p><p><span class="caption">▼リスト15.56: WFI命令のデコード (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c44e82610150bbc21d85f0fb0d698a2c39d12914~1..c44e82610150bbc21d85f0fb0d698a2c39d12914#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>OP_SYSTEM: f3 != <span class="hljs-number">3&#39;b000</span> &amp;&amp; f3 != <span class="hljs-number">3&#39;b100</span> || <span class="hljs-comment">// CSRR(W|S|C)[I]</span>
 bits == <span class="hljs-number">32&#39;h00000073</span> || <span class="hljs-comment">// ECALL</span>
 bits == <span class="hljs-number">32&#39;h00100073</span> || <span class="hljs-comment">// EBREAK</span>
 bits == <span class="hljs-number">32&#39;h30200073</span> <span class="custom-hl-bold">||</span> <span class="hljs-comment">//MRET</span>
 <span class="custom-hl-bold">bits == <span class="hljs-number">32&#39;h10500073</span></span>, <span class="custom-hl-bold"><span class="hljs-comment">// WFI</span></span>
OP_MISC_MEM: T, <span class="hljs-comment">// FENCE</span>
</code></pre></div><p>WFI命令で割り込みが発生するとき、mepcレジスタに<code>pc + 4</code>を書き込むようにします ( リスト57、 リスト58 )。</p><p><span class="caption">▼リスト15.57: WFI命令の判定 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c44e82610150bbc21d85f0fb0d698a2c39d12914~1..c44e82610150bbc21d85f0fb0d698a2c39d12914#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> is_wfi: <span class="hljs-keyword">logic</span> = inst_bits == <span class="hljs-number">32&#39;h10500073</span>;
</code></pre></div><p><span class="caption">▼リスト15.58: WFI命令のとき、mepcをpc+4にする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c44e82610150bbc21d85f0fb0d698a2c39d12914~1..c44e82610150bbc21d85f0fb0d698a2c39d12914#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> raise_expt || raise_interrupt {
    mepc = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_expt ? pc : <span class="hljs-comment">// exception</span></span>
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_interrupt &amp;&amp; is_wfi ? pc + <span class="hljs-number">4</span> : pc; <span class="hljs-comment">// interrupt when wfi / interrupt</span></span>
    mcause = trap_cause;
</code></pre></div><h2 id="time、instret、cycleレジスタの実装" tabindex="-1">time、instret、cycleレジスタの実装 <a class="header-anchor" href="#time、instret、cycleレジスタの実装" aria-label="Permalink to “time、instret、cycleレジスタの実装”">​</a></h2><p>RISC-Vにはtime、instret、cycleという読み込み専用のCSRが定義されており、 それぞれmtime、minstret、mcycleレジスタと同じ値をとります<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>。</p><p><code>CsrAddr</code>型にレジスタのアドレスを追加します (リスト59)。</p><p><span class="caption">▼リスト15.59: アドレスの定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92~1..8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Unprivileged Counter/Timers</span>
CYCLE = <span class="hljs-number">12&#39;hC00</span>,
TIME = <span class="hljs-number">12&#39;hC01</span>,
INSTRET = <span class="hljs-number">12&#39;hC02</span>,
</code></pre></div><p>mtimeレジスタの値をACLINTモジュールからcsrunitに渡します ( リスト60、 リスト61 )。</p><p><span class="caption">▼リスト15.60: mtimeをインターフェースに追加する (aclint_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92~1..8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92#diff-4a970aed66e74f1c5e4a4397d31cedb3bb820d7d48d43d55e416807cb192c5ea">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">import</span> eei::*;</span>

<span class="hljs-keyword">interface</span> aclint_if {
    <span class="hljs-keyword">var</span> msip : <span class="hljs-keyword">logic</span> ;
    <span class="hljs-keyword">var</span> mtip : <span class="hljs-keyword">logic</span> ;
    <span class="custom-hl-bold"><span class="hljs-keyword">var</span> mtime: UInt64;</span>
    <span class="hljs-keyword">modport</span> master {
        msip : <span class="hljs-keyword">output</span>,
        mtip : <span class="hljs-keyword">output</span>,
        <span class="custom-hl-bold">mtime: <span class="hljs-keyword">output</span>,</span>
    }
</code></pre></div><p><span class="caption">▼リスト15.61: mtimeをインターフェースに割り当てる (aclint_memory.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92~1..8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92#diff-1badfc28e588ad23679fda7668c8b8d2caf435239977507b569c8acce1e86170">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    aclint.msip  = msip0;
    aclint.mtip  = mtime &gt;= mtimecmp0;
    <span class="custom-hl-bold">aclint.mtime = mtime;</span>
}
</code></pre></div><p>time、instret、cycleレジスタを読み込めるようにします (リスト62)。</p><p><span class="caption">▼リスト15.62: rdataにインターフェースのmtimeを割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92~1..8336791652bd74d9a0e52fbb7ea7c1cc53fcbe92#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::CYCLE   : mcycle,
CsrAddr::TIME    : aclint.mtime,
CsrAddr::INSTRET : minstret,
</code></pre></div><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>コンパイル、実行方法は<a href="./12-impl-mmio.html">「11.6.4 出力をテストする」</a>を参考にしてください。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>mhpmcounterレジスタと同じ値をとるhpmcounterレジスタもありますが、mhpmcounterレジスタを実装していないので実装しません。 <a href="#fnref2" class="footnote-backref">↩︎</a></p></li></ol></section>`,242)])])}const v=a(r,[["render",i]]);export{j as __pageData,v as default};
