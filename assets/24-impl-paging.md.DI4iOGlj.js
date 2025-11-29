import{_ as a,c as e,o as n,ah as p,bW as c,bX as l,bY as d,bZ as t,b_ as o,b$ as r,c0 as b,c1 as i,c2 as f,c3 as h,c4 as u,c5 as m}from"./chunks/framework.BNheOMQd.js";const C=JSON.parse('{"title":"S-modeの実装 (2. 仮想記憶システム)","description":"","frontmatter":{},"headers":[],"relativePath":"24-impl-paging.md","filePath":"24-impl-paging.md"}'),y={name:"24-impl-paging.md"};function v(_,s,j,w,g,k){return n(),e("div",null,[...s[0]||(s[0]=[p('<h1 id="s-modeの実装-2-仮想記憶システム" tabindex="-1">S-modeの実装 (2. 仮想記憶システム) <a class="header-anchor" href="#s-modeの実装-2-仮想記憶システム" aria-label="Permalink to “S-modeの実装 (2. 仮想記憶システム)”">​</a></h1><h2 id="概要" tabindex="-1">概要 <a class="header-anchor" href="#概要" aria-label="Permalink to “概要”">​</a></h2><h3 id="仮想記憶システム" tabindex="-1">仮想記憶システム <a class="header-anchor" href="#仮想記憶システム" aria-label="Permalink to “仮想記憶システム”">​</a></h3><p>仮想記憶(Virtual Memory)とは、メモリを管理する手法の一種です。 仮想的なアドレス(virtual address、仮想アドレス)を実際のアドレス(real address、実アドレス)に変換することにより、 実際のアドレス空間とは異なるアドレス空間を提供することができます。 実アドレスのことを物理アドレス(physical address)と呼ぶことがあります。</p><p>仮想記憶を利用すると、次のような動作を実現できます。</p><ol><li>連続していない物理アドレス空間を仮想的に連続したアドレス空間として扱う。</li><li>特定のアドレスにしか配置できない(特定のアドレスで動くことを前提としている)プログラムを、そのアドレスとは異なる物理アドレスに配置して実行する。</li><li>アプリケーションごとにアドレス空間を分離する。</li></ol><p>一般的に仮想記憶システムはハードウェアによって提供されます。 メモリアクセスを処理するハードウェア部品のことをメモリ管理ユニット(Memory Management Unit, MMU)と呼びます。</p><h3 id="ページング方式" tabindex="-1">ページング方式 <a class="header-anchor" href="#ページング方式" aria-label="Permalink to “ページング方式”">​</a></h3><p>仮想記憶システムを実現する方式の1つにページング方式(Paging)があります。 ページング方式は、物理アドレス空間の一部をページ(Page)という単位に割り当て、 ページを参照するための情報をページテーブル(Page Table)に格納します。 ページテーブルに格納する情報の単位のことをページテーブルエントリ(Page Table Entry、PTE)と呼びます。 仮想アドレスから物理アドレスへの変換はページテーブルにあるPTEを参照して行います(図1)。</p><p><img src="'+c+'" alt="仮想アドレスの変換にPTEを使う"></p><h3 id="risc-vの仮想記憶システム" tabindex="-1">RISC-Vの仮想記憶システム <a class="header-anchor" href="#risc-vの仮想記憶システム" aria-label="Permalink to “RISC-Vの仮想記憶システム”">​</a></h3><p>RISC-Vの仮想記憶システムはページング方式を採用しており、 RV32I向けにはSv32、RV64I向けにはSv39、Sv48、Sv57が定義されています。</p><p>RISC-Vの仮想アドレスの変換を簡単に説明します。 仮想アドレスの変換は次のプロセスで行います。</p><p>(a) satpレジスタのPPNフィールドと仮想アドレスのフィールドからPTEの物理アドレスを作る。 (b) PTEを読み込む。PTEが有効なものか確認する。 (c) PTEがページを指しているとき、PTEに書かれている権限を確認してから物理アドレスを作り、アドレス変換終了。 (d) PTEが次のPTEを指しているとき、PTEのフィールドと仮想アドレスのフィールドから次のPTEの物理アドレスを作り、(b)に戻る。</p><p>satpレジスタは仮想記憶システムを制御するためのCSRです。 一番最初に参照するPTEのことをroot PTEと呼びます。 また、PTEがページを指しているとき、そのPTEのことをleaf PTEと呼びます。</p><p>RISC-Vのページングでは、 satpレジスタと仮想アドレス、PTEを使って多段階のPTEの参照を行い、 仮想アドレスを物理アドレスに変換します。 Sv39の場合、何段階で物理アドレスに変換できるかによってページサイズは4KiB、2MiB、1GiBと異なります。 これ以降、MMU内のページング方式を実現する部品のことをPTW(Page Table Walker)と呼びます<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。</p><h2 id="satpレジスタ" tabindex="-1">satpレジスタ <a class="header-anchor" href="#satpレジスタ" aria-label="Permalink to “satpレジスタ”">​</a></h2><p><img src="'+l+'" alt="satpレジスタ"> RISC-Vの仮想記憶システムはsatpレジスタによって制御します。</p><p>MODEは仮想アドレスの変換方式を指定するフィールドです。 方式と値は表1のように対応しています。 方式がBare(<code>0</code>)のときはアドレス変換を行いません(仮想アドレス=物理アドレス)。</p><div id="satp.numtomode" class="table"><p class="caption">表18.1: 方式とMODEの値の対応</p><table><tr class="hline"><th>方式</th><th>MODE</th></tr><tr class="hline"><td>Bare</td><td>0</td></tr><tr class="hline"><td>Sv39</td><td>8</td></tr><tr class="hline"><td>Sv48</td><td>9</td></tr><tr class="hline"><td>Sv57</td><td>10</td></tr></table></div> ASID(Address Space IDentifier)は仮想アドレスが属するアドレス空間のIDです。 動かすアプリケーションによってIDを変えることでMMUにアドレス変換の高速化のヒントを与えることができます。 本章ではキャッシュ機構を持たない単純なモジュールを実装するため、ASIDを無視したアドレス変換を実装します[^51]。 <p><img src="'+d+'" alt="root PTEのアドレスはsatpレジスタと仮想アドレスから構成される"> PPN(Physical Page Number)はroot PTEの物理アドレスの一部を格納するフィールドです。 root PTEのアドレスは仮想アドレスのVPNビットと組み合わせて作られます(図3)。</p><h2 id="sv39のアドレス変換" tabindex="-1">Sv39のアドレス変換 <a class="header-anchor" href="#sv39のアドレス変換" aria-label="Permalink to “Sv39のアドレス変換”">​</a></h2><p><img src="'+t+'" alt="仮想アドレス"><img src="'+o+'" alt="物理アドレス"> Sv39では39ビットの仮想アドレスを56ビットの物理アドレスに変換します。</p><p>ページの最小サイズは4096(<code>2 ** 12</code>)バイト、 PTEのサイズは8(<code>2 ** 3</code>)バイトです。 それぞれ12と8をPAGESIZE、PTESIZEという定数として定義します。</p><p>ページテーブルのサイズ(1つのページテーブルに含まれるPTEの数)は512(= <code>2 ** 9</code>)個です。 1回のアドレス変換で、最大3回PTEをフェッチし、leaf PTEを見つけます。</p><p>アドレスの変換途中でPTEが不正な値だったり、ページが求める権限を持たずにページにアクセスしようとした場合、 アクセスする目的に応じたページフォルト(Page fault)例外が発生します<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>。 命令フェッチはInstruction page fault例外、ロード命令はLoad page fault例外、ストアとAMO命令はStore/AMO page fault例外が発生します。</p><h3 id="ページングが有効になる条件" tabindex="-1">ページングが有効になる条件 <a class="header-anchor" href="#ページングが有効になる条件" aria-label="Permalink to “ページングが有効になる条件”">​</a></h3><p>satpレジスタのMODEフィールドがSv39のとき、S-mode、U-modeでアドレス変換が有効になります。 ただし、ロードストアのときは、mstatus.MPRVが<code>1</code>なら特権レベルをmstatus.MPPとして判定します。</p><p>有効な仮想アドレスは、MSBでXLENビットに拡張された値である必要があります。 有効ではない仮想アドレスの場合、ページフォルト例外が発生します。</p><h3 id="pteのフェッチ" tabindex="-1">PTEのフェッチ <a class="header-anchor" href="#pteのフェッチ" aria-label="Permalink to “PTEのフェッチ”">​</a></h3><p><img src="'+r+'" alt="PTEのアドレス"> ページングが有効なとき、まずroot PTEをフェッチします。 ここでlevelという変数の値を<code>2</code>とします。</p><p>root PTEの物理アドレスは、 satpレジスタのPPNフィールドと仮想アドレスの<code>VPN[level]</code>フィールドを結合し、 <code>log2(PTESIZE)</code>だけ左シフトしたアドレスになります。 このアドレスは、PPNフィールドを12ビット左シフトしたアドレスに存在するページテーブルの、 VPN[level]番目のPTEのアドレスです。</p><p><img src="'+b+'" alt="PTEのフィールド"> PTEのフィールドは図7のようになっています。 このうちN、PBMT、Reservedは使用せず、<code>0</code>でなければページフォルト例外を発生させます。 RSWビットは無視します。</p><p>下位8ビットはPTEの状態と権限を表すビットです。</p><p>Vが<code>1</code>のとき、有効なPTEであることを示します。 <code>0</code>ならページフォルト例外を発生させます。</p><p>R、W、X、Uはページの権限を指定するビットです。 Rは読み込み許可、Wは書き込み許可、Xは実行許可、UはU-modeでアクセスできるかを示します。 書き込みできるPTEは読み込みできる必要があり、 Wが<code>1</code>なのにRが<code>0</code>ならページフォルト例外を発生させます。</p><p>RとXが<code>0</code>のとき、PTEは次のPTEを指しています。 このとき、levelが<code>0</code>ならこれ以上PTEを指すことはできない(VPN[-1]は無い)ので、ページフォルト例外を発生させます。 levelが<code>1</code>以上なら、levelから<code>1</code>を引いてPTEをフェッチします。 次のPTEのアドレスは、PTEのPPN[2]、PPN[1]、PPN[0]と仮想アドレスのVPN[level]を結合し、 <code>log2(PTESIZE)</code>だけ左シフトしたアドレスになります。</p><p>PTEのRかXが<code>1</code>のとき、PTEはleaf PTEで、ページを指し示しています。</p><p>物理アドレスを計算する前に、R、W、X、Uビットで権限を確認します。 命令フェッチのときはX、ロードのときはR、ストアのときはW、U-modeのときはUが立っている必要があります。 S-modeのときは、Uが立っているページにmstatus.SUMが<code>0</code>の状態でアクセスできません。 S-modeのときは、Uが立っているページの実行はできません。 これらに違反した場合、ページフォルト例外が発生します。</p><p><img src="'+i+'" alt="levelが2のときの物理アドレス"> levelが<code>2</code>なら、物理アドレスはPTEのPPN[2]、仮想アドレスのVPN[1]、VPN[0]、page offsetを結合した値になります(図8)。</p><p><img src="'+f+'" alt="levelが1のときの物理アドレス"> levelが<code>1</code>なら、物理アドレスはPTEのPPN[2]、PPN[1]、仮想アドレスのVPN[0]、page offsetを結合した値になります(図9)。</p><p><img src="'+h+'" alt="levelが0のときの物理アドレス"> levelが<code>0</code>なら、物理アドレスはPTEのPPN[2]、PPN[1]、PPN[0]、仮想アドレスのpage offsetを結合した値になります(図10)。</p><p>leaf PTEの使わないPPNフィールドは<code>0</code>である必要があり、<code>0</code>ではないならページフォルト例外を発生させます。</p><p>求めた物理アドレスにアクセスする前に、leaf PTEのA、Dビットを確認します。 Aはページがこれまでにアクセスされたか、Dはページがこれまでに書き換えられたかを示すビットです。 Aが<code>0</code>のとき、Aを<code>1</code>に設定します。 Dが<code>0</code>でストアするとき、Dを<code>1</code>に設定します。 Aは投機的に<code>1</code>に変更できますが、Dは命令が実行された場合にしか<code>1</code>に変更できません。</p><h2 id="実装順序" tabindex="-1">実装順序 <a class="header-anchor" href="#実装順序" aria-label="Permalink to “実装順序”">​</a></h2><p>RISC-Vでは命令フェッチ、データのロードストアの両方でページングを利用できます。 命令フェッチ、データのロードストアのそれぞれのために2つのPTWを用意してもいいですが、 シンプルなアーキテクチャにするために本章では1つのPTWを共有することにします。</p><p>inst_fetcherモジュール、amounitモジュールは仮想アドレスを扱うことがありますが、 mmio_controllerモジュールは常に物理アドレス空間を扱います。 そのため、inst_fetcherモジュール、amounitモジュールとmmio_controllerモジュールの間にPTWを配置します(図11)。</p><p>本章では、仮想記憶システムを次の順序で実装します。</p><ol><li>PTWで発生する例外をcsrunitモジュールに伝達する</li><li>Bareにだけ対応したアドレス変換モジュール(ptw)を実装する</li><li>satpレジスタ、mstatusのMXR、SUM、MPRVビットを実装する</li><li>Sv39を実装する</li><li>SFENCE.VMA命令、FENCEI命令を実装する</li></ol><p><img src="'+u+`" alt="PTWと他のモジュールの接続"></p><h2 id="メモリで発生する例外の実装" tabindex="-1">メモリで発生する例外の実装 <a class="header-anchor" href="#メモリで発生する例外の実装" aria-label="Permalink to “メモリで発生する例外の実装”">​</a></h2><p>PTWで発生した例外は、最終的にcsrunitモジュールで処理します。 そのために、例外の情報をメモリのインターフェースを使って伝達します。</p><p>ページングによって発生する例外のcauseを<code>CsrCause</code>型に追加します (リスト1)。</p><p><span class="caption">▼リスト18.1: CsrCause型にページフォルト例外を追加する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>INSTRUCTION_PAGE_FAULT = <span class="hljs-number">12</span>,
LOAD_PAGE_FAULT = <span class="hljs-number">13</span>,
STORE_AMO_PAGE_FAULT = <span class="hljs-number">15</span>,
</code></pre></div><h3 id="例外を伝達する" tabindex="-1">例外を伝達する <a class="header-anchor" href="#例外を伝達する" aria-label="Permalink to “例外を伝達する”">​</a></h3><h4 id="構造体の定義" tabindex="-1">構造体の定義 <a class="header-anchor" href="#構造体の定義" aria-label="Permalink to “構造体の定義”">​</a></h4><p><code>MemException</code>構造体を定義します (リスト2)。 メモリアクセス中に発生する例外の情報はこの構造体で管理します。</p><p><span class="caption">▼リスト18.2: MemException型の定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> MemException {
    valid     : <span class="hljs-keyword">logic</span>,
    page_fault: <span class="hljs-keyword">logic</span>,
}
</code></pre></div><p><code>membus_if</code>、<code>core_data_if</code>、<code>core_inst_if</code>インターフェースに<code>MemException</code>構造体を追加します ( リスト3、 リスト4、 リスト5 )。 インターフェースの<code>rvalid</code>が<code>1</code>で、 構造体の<code>valid</code>と<code>is_page_fault</code>が<code>1</code>なら ページフォルト例外が発生したことを示します。</p><p><span class="caption">▼リスト18.3: MemException型を追加する (membus_if.veryl, core_data_if.veryl, core_inst_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5b8ff8b1b43eb415d367759fb46872980d16065c43c0a71a75fec85e987ad460">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> expt  : eei::MemException                ;
</code></pre></div><p><span class="caption">▼リスト18.4: masterにexptを追加する (membus_if.veryl, core_data_if.veryl, core_inst_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5b8ff8b1b43eb415d367759fb46872980d16065c43c0a71a75fec85e987ad460">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">modport</span> master {
    valid       : <span class="hljs-keyword">output</span>,
    ready       : <span class="hljs-keyword">input</span> ,
    addr        : <span class="hljs-keyword">output</span>,
    wen         : <span class="hljs-keyword">output</span>,
    wdata       : <span class="hljs-keyword">output</span>,
    wmask       : <span class="hljs-keyword">output</span>,
    rvalid      : <span class="hljs-keyword">input</span> ,
    rdata       : <span class="hljs-keyword">input</span> ,
    <span class="custom-hl-bold">expt        : <span class="hljs-keyword">input</span> ,</span>
    wmask_expand: <span class="hljs-keyword">import</span>,
}
</code></pre></div><p><span class="caption">▼リスト18.5: responseにexptを追加する (membus_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5b8ff8b1b43eb415d367759fb46872980d16065c43c0a71a75fec85e987ad460">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">modport</span> response {
    rvalid: <span class="hljs-keyword">output</span>,
    rdata : <span class="hljs-keyword">output</span>,
    expt  : <span class="hljs-keyword">output</span>,
}
</code></pre></div><h4 id="mmio-controllerモジュールの対応" tabindex="-1">mmio_controllerモジュールの対応 <a class="header-anchor" href="#mmio-controllerモジュールの対応" aria-label="Permalink to “mmio_controllerモジュールの対応”">​</a></h4><p>mmio_controllerモジュールで構造体の値をすべて<code>0</code>に設定します ( リスト6、 リスト7 )。 いまのところ、デバイスは例外を発生させません。</p><p><span class="caption">▼リスト18.6: exptを0に設定する (membus_if.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    req_core.ready  = <span class="hljs-number">0</span>;
    req_core.rvalid = <span class="hljs-number">0</span>;
    req_core.rdata  = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">req_core.expt   = <span class="hljs-number">0</span>;</span>
</code></pre></div><p>mmio_controllerモジュールからの例外情報を <code>core_data_if</code>、<code>core_inst_if</code>インターフェースに伝達します。</p><p><span class="caption">▼リスト18.7: exptを伝達する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    i_membus.ready  = mmio_membus.ready &amp;&amp; !d_membus.valid;
    i_membus.rvalid = mmio_membus.rvalid &amp;&amp; memarb_last_i;
    i_membus.rdata  = mmio_membus.rdata;
    <span class="custom-hl-bold">i_membus.expt   = mmio_membus.expt;</span>

    d_membus.ready  = mmio_membus.ready;
    d_membus.rvalid = mmio_membus.rvalid &amp;&amp; !memarb_last_i;
    d_membus.rdata  = mmio_membus.rdata;
    <span class="custom-hl-bold">d_membus.expt   = mmio_membus.expt;</span>
</code></pre></div><h4 id="inst-fetcherモジュールの対応" tabindex="-1">inst_fetcherモジュールの対応 <a class="header-anchor" href="#inst-fetcherモジュールの対応" aria-label="Permalink to “inst_fetcherモジュールの対応”">​</a></h4><p>inst_fetcherモジュールからcoreモジュールに例外情報を伝達します。 まず、FIFOの型に例外情報を追加します ( リスト8、 リスト9) )。</p><p><span class="caption">▼リスト18.8: fetch_firo_typeにMemException型を追加する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> fetch_fifo_type {
    addr: Addr                           ,
    bits: <span class="hljs-keyword">logic</span>       &lt;MEMBUS_DATA_WIDTH&gt;,
    <span class="custom-hl-bold">expt: MemException                   ,</span>
}
</code></pre></div><p><span class="caption">▼リスト18.9: issue_fifo_typeにMemException型を追加する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> issue_fifo_type {
    addr  : Addr        ,
    bits  : Inst        ,
    is_rvc: <span class="hljs-keyword">logic</span>       ,
    <span class="custom-hl-bold">expt  : MemException,</span>
}
</code></pre></div><p>メモリからの例外情報を<code>fetch_fifo</code>に保存します (リスト10)。</p><p><span class="caption">▼リスト18.10: メモリの例外情報をfetch_fifoに保存する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    fetch_fifo_flush      = core_if.is_hazard;
    fetch_fifo_wvalid     = fetch_requested &amp;&amp; mem_if.rvalid;
    fetch_fifo_wdata.addr = fetch_pc_requested;
    fetch_fifo_wdata.bits = mem_if.rdata;
    <span class="custom-hl-bold">fetch_fifo_wdata.expt = mem_if.expt;</span>
}
</code></pre></div><p><code>fetch_fifo</code>から<code>issue_fifo</code>に例外情報を伝達します ( リスト11)、 リスト12、 リスト13 )。 offsetが<code>6</code>で例外が発生しているとき、 32ビット幅の命令の上位16ビットを取得せずにすぐに<code>issue_fifo</code>に例外を書き込みます。</p><p><span class="caption">▼リスト18.11: fetch_fifoからissue_fifoに例外情報を伝達する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-keyword">let</span> raddr : Addr                            = fetch_fifo_rdata.addr;
    <span class="hljs-keyword">let</span> rdata : <span class="hljs-keyword">logic</span>       &lt;MEMBUS_DATA_WIDTH&gt; = fetch_fifo_rdata.bits;
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> expt  : MemException                    = fetch_fifo_rdata.expt;</span>
    <span class="hljs-keyword">let</span> offset: <span class="hljs-keyword">logic</span>       &lt;<span class="hljs-number">3</span>&gt;                 = issue_pc_offset;

    fetch_fifo_rready     = <span class="hljs-number">0</span>;
    issue_fifo_wvalid     = <span class="hljs-number">0</span>;
    issue_fifo_wdata      = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">issue_fifo_wdata.expt = expt;</span>
</code></pre></div><p><span class="caption">▼リスト18.12: offsetが6のときに例外が発生している場合、すぐにissue_fifoに例外を書き込む (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>fetch_fifo_rready = <span class="hljs-number">1</span>;
<span class="hljs-keyword">if</span> rvcc_is_rvc <span class="custom-hl-bold">|| expt.valid</span> {
    issue_fifo_wvalid       = <span class="hljs-number">1</span>;
    issue_fifo_wdata.addr   = {raddr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};
    issue_fifo_wdata.is_rvc = <span class="hljs-number">1</span>;
    issue_fifo_wdata.bits   = rvcc_inst32;
</code></pre></div><p><span class="caption">▼リスト18.13: 例外が発生しているときは32ビット幅の命令の上位16ビットを取得しない (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> issue_pc_offset == <span class="hljs-number">6</span> &amp;&amp; !rvcc_is_rvc &amp;&amp; !issue_is_rdata_saved <span class="custom-hl-bold">&amp;&amp; !fetch_fifo_rdata.expt.valid</span> {
    <span class="hljs-keyword">if</span> fetch_fifo_rvalid {
        issue_is_rdata_saved = <span class="hljs-number">1</span>;
</code></pre></div><p><code>issue_fifo</code>からcoreモジュールに例外情報を伝達します (リスト14)。</p><p><span class="caption">▼リスト18.14: issue_fifoからcoreモジュールに例外情報を伝達する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    issue_fifo_flush  = core_if.is_hazard;
    issue_fifo_rready = core_if.rready;
    core_if.rvalid    = issue_fifo_rvalid;
    core_if.raddr     = issue_fifo_rdata.addr;
    core_if.rdata     = issue_fifo_rdata.bits;
    core_if.is_rvc    = issue_fifo_rdata.is_rvc;
    <span class="custom-hl-bold">core_if.expt      = issue_fifo_rdata.expt;</span>
}
</code></pre></div><h4 id="amounitモジュールの対応" tabindex="-1">amounitモジュールの対応 <a class="header-anchor" href="#amounitモジュールの対応" aria-label="Permalink to “amounitモジュールの対応”">​</a></h4><p><code>state</code>が<code>State::Init</code>以外の時に例外が発生した場合、 すぐに結果を返すようにします ( リスト15、 リスト16、 リスト17、 )。 例外が発生したクロックでは要求を受け付けないようにします。</p><p><span class="caption">▼リスト18.15: slaveにexptを割り当てる (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    slave.ready  = <span class="hljs-number">0</span>;
    slave.rvalid = <span class="hljs-number">0</span>;
    slave.rdata  = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">slave.expt   = master.expt;</span>
</code></pre></div><p><span class="caption">▼リスト18.16: 例外が発生したらすぐに結果を返し、readyを0にする (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>        <span class="hljs-keyword">default</span>: {}
    }

    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> state != State::Init &amp;&amp; master.expt.valid {</span>
    <span class="custom-hl-bold">    slave.ready  = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">    slave.rvalid = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">}</span>
}
</code></pre></div><p><span class="caption">▼リスト18.17: 例外が発生していたらmasterに要求するのをやめる (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>        State::AMOStoreValid: accept_request_comb();
        <span class="hljs-keyword">default</span>             : {}
    }

    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> state != State::Init &amp;&amp; master.expt.valid {</span>
    <span class="custom-hl-bold">    reset_master();</span>
    <span class="custom-hl-bold">}</span>
}
</code></pre></div><p>例外が発生したら、<code>state</code>を<code>State::Init</code>にリセットします (リスト18)。</p><p><span class="caption">▼リスト18.18: 例外が発生していたらstateをInitにリセットする (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> on_clock () {
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> state != State::Init &amp;&amp; master.expt.valid {</span>
    <span class="custom-hl-bold">    state = State::Init;</span>
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
        <span class="hljs-keyword">case</span> state {
            State::Init     : accept_request_ff();
</code></pre></div><h4 id="instruction-page-fault例外の実装" tabindex="-1">Instruction page fault例外の実装 <a class="header-anchor" href="#instruction-page-fault例外の実装" aria-label="Permalink to “Instruction page fault例外の実装”">​</a></h4><p>命令フェッチ処理中にページフォルト例外が発生していたとき、 Instruction page fault例外を発生させます。 xtvalには例外が発生したアドレスを設定します (リスト19)。</p><p><span class="caption">▼リスト18.19: i_membusの例外をExceptionInfo型に設定する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">if</span> i_membus.expt.valid {</span>
<span class="custom-hl-bold">    <span class="hljs-comment">// fault</span></span>
<span class="custom-hl-bold">    exq_wdata.expt.valid = <span class="hljs-number">1</span>;</span>
<span class="custom-hl-bold">    exq_wdata.expt.cause = CsrCause::INSTRUCTION_PAGE_FAULT;</span>
<span class="custom-hl-bold">    exq_wdata.expt.value = ids_pc;</span>
<span class="custom-hl-bold">} <span class="hljs-keyword">else</span></span> <span class="hljs-keyword">if</span> !ids_inst_valid {
</code></pre></div><h4 id="ロード、ストア命令のpage-fault例外の実装" tabindex="-1">ロード、ストア命令のpage fault例外の実装 <a class="header-anchor" href="#ロード、ストア命令のpage-fault例外の実装" aria-label="Permalink to “ロード、ストア命令のpage fault例外の実装”">​</a></h4><p>ロード命令、ストア命令、A拡張の命令のメモリアクセス中にページフォルト例外が発生していたとき、 Load page fault例外、Store/AMO page fault例外を発生させます。</p><p>csrunitモジュールに、 メモリにアクセスする命令の例外情報を監視するためのポートを作成します ( リスト20、 リスト21 )。</p><p><span class="caption">▼リスト18.20: メモリアドレス、例外の監視用のポートを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> csrunit (
    clk        : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                   ,
    rst        : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                   ,
    valid      : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>                   ,
    pc         : <span class="hljs-keyword">input</span>   Addr                    ,
    inst_bits  : <span class="hljs-keyword">input</span>   Inst                    ,
    ctrl       : <span class="hljs-keyword">input</span>   InstCtrl                ,
    expt_info  : <span class="hljs-keyword">input</span>   ExceptionInfo           ,
    rd_addr    : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>               &lt;<span class="hljs-number">5</span>&gt; ,
    csr_addr   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>               &lt;<span class="hljs-number">12</span>&gt;,
    rs1_addr   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>               &lt;<span class="hljs-number">5</span>&gt; ,
    rs1_data   : <span class="hljs-keyword">input</span>   UIntX                   ,
    can_intr   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>                   ,
    <span class="custom-hl-bold">mem_addr   : <span class="hljs-keyword">input</span>   Addr                    ,</span>
    rdata      : <span class="hljs-keyword">output</span>  UIntX                   ,
    mode       : <span class="hljs-keyword">output</span>  PrivMode                ,
    raise_trap : <span class="hljs-keyword">output</span>  <span class="hljs-keyword">logic</span>                   ,
    trap_vector: <span class="hljs-keyword">output</span>  Addr                    ,
    trap_return: <span class="hljs-keyword">output</span>  <span class="hljs-keyword">logic</span>                   ,
    minstret   : <span class="hljs-keyword">input</span>   UInt64                  ,
    led        : <span class="hljs-keyword">output</span>  UIntX                   ,
    aclint     : <span class="hljs-keyword">modport</span> aclint_if::slave        ,
    <span class="custom-hl-bold">membus     : <span class="hljs-keyword">modport</span> core_data_if::master    ,</span>
) {
</code></pre></div><p><span class="caption">▼リスト18.21: csrunitモジュールにメモリアドレスとインターフェースを割り当てる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> csru: csrunit (
    clk                               ,
    rst                               ,
    valid      : mems_valid           ,
    pc         : mems_pc              ,
    inst_bits  : mems_inst_bits       ,
    ctrl       : mems_ctrl            ,
    expt_info  : mems_expt            ,
    rd_addr    : mems_rd_addr         ,
    csr_addr   : mems_inst_bits[<span class="hljs-number">31</span>:<span class="hljs-number">20</span>],
    rs1_addr   : memq_rdata.rs1_addr  ,
    rs1_data   : memq_rdata.rs1_data  ,
    can_intr   : mems_is_new          ,
    <span class="custom-hl-bold">mem_addr   : memu_addr            ,</span>
    rdata      : csru_rdata           ,
    mode       : csru_priv_mode       ,
    raise_trap : csru_raise_trap      ,
    trap_vector: csru_trap_vector     ,
    trap_return: csru_trap_return     ,
    minstret                          ,
    led                               ,
    aclint                            ,
    <span class="custom-hl-bold">membus     : d_membus             ,</span>
);
</code></pre></div><p>例外を発生させます (リスト22、 リスト23)。</p><p><span class="caption">▼リスト18.22: メモリアクセス中に例外が発生しているかをチェックする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_memory_fault    : <span class="hljs-keyword">logic</span> = membus.rvalid &amp;&amp; membus.expt.valid;
</code></pre></div><p><span class="caption">▼リスト18.23: 例外を発生させる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> raise_expt: <span class="hljs-keyword">logic</span> = valid &amp;&amp; (expt_info.valid || expt_write_readonly_csr || expt_csr_priv_violation || expt_zicntr_priv || expt_trap_return_priv <span class="custom-hl-bold">|| expt_memory_fault</span>);
<span class="hljs-keyword">let</span> expt_cause: UIntX = <span class="hljs-keyword">switch</span> {
    expt_info.valid        : expt_info.cause,
    expt_write_readonly_csr: CsrCause::ILLEGAL_INSTRUCTION,
    expt_csr_priv_violation: CsrCause::ILLEGAL_INSTRUCTION,
    expt_zicntr_priv       : CsrCause::ILLEGAL_INSTRUCTION,
    expt_trap_return_priv  : CsrCause::ILLEGAL_INSTRUCTION,
    <span class="custom-hl-bold">expt_memory_fault      : <span class="hljs-keyword">if</span> ctrl.is_load ? CsrCause::LOAD_PAGE_FAULT : CsrCause::STORE_AMO_PAGE_FAULT,</span>
    <span class="hljs-keyword">default</span>                : <span class="hljs-number">0</span>,
};
</code></pre></div><p>xtvalに例外が発生したアドレスを設定します (リスト24)。</p><p><span class="caption">▼リスト18.24: 例外の原因を設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3694352fc2da7237d4ecf6bd59c0b148f7e55033~1..3694352fc2da7237d4ecf6bd59c0b148f7e55033#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_value: UIntX = <span class="hljs-keyword">switch</span> {
    expt_info.valid                             : expt_info.value,
    expt_cause == CsrCause::ILLEGAL_INSTRUCTION : {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - $bits(Inst), inst_bits},
    <span class="custom-hl-bold">expt_cause == CsrCause::LOAD_PAGE_FAULT     : mem_addr,</span>
    <span class="custom-hl-bold">expt_cause == CsrCause::STORE_AMO_PAGE_FAULT: mem_addr,</span>
    <span class="hljs-keyword">default</span>                                     : <span class="hljs-number">0</span>
};
</code></pre></div><h3 id="ページフォルトが発生した正確なアドレスを特定する" tabindex="-1">ページフォルトが発生した正確なアドレスを特定する <a class="header-anchor" href="#ページフォルトが発生した正確なアドレスを特定する" aria-label="Permalink to “ページフォルトが発生した正確なアドレスを特定する”">​</a></h3><p>ページフォルト例外が発生したとき、 xtvalにはページフォルトが発生した仮想アドレスを格納します。</p><p>実は現状の実装では、 メモリにアクセスする操作がページの境界をまたぐとき、 ページフォルトが発生した正確な仮想アドレスをxtvalに格納できていません。</p><p>例えば、inst_fetcherモジュールで32ビット幅の命令を2回のメモリ読み込みでフェッチするとき、 1回目(下位16ビット)のロードは成功して、2回目(上位16ビット)のロードでページフォルトが発生したとします。 このとき、ページフォルトが発生したアドレスは2回目のロードでアクセスしたアドレスなのに、 xtvalには1回目のロードでアクセスしたアドレスが書き込まれます。</p><p>これに対処するために、例外が発生したアドレスのオフセットを例外情報に追加します ( リスト25 )。</p><p><span class="caption">▼リスト18.25: MemException型にaddr_offsetを追加する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/486dc062b1d861df65d24eed6ba7cb486bf1b2f9~1..486dc062b1d861df65d24eed6ba7cb486bf1b2f9#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> MemException {
    valid      : <span class="hljs-keyword">logic</span>   ,
    page_fault : <span class="hljs-keyword">logic</span>   ,
    <span class="custom-hl-bold">addr_offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;,</span>
}
</code></pre></div><p>inst_fetcherモジュールで、 32ビット幅の命令の上位16ビットを読み込んで<code>issue_fifo</code>に書き込むときに、 オフセットを<code>2</code>に設定します (リスト26)。</p><p><span class="caption">▼リスト18.26: オフセットを2に設定する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/486dc062b1d861df65d24eed6ba7cb486bf1b2f9~1..486dc062b1d861df65d24eed6ba7cb486bf1b2f9#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> issue_is_rdata_saved {
    issue_fifo_wvalid                 = <span class="hljs-number">1</span>;
    issue_fifo_wdata.addr             = {issue_saved_addr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};
    issue_fifo_wdata.bits             = {rdata[<span class="hljs-number">15</span>:<span class="hljs-number">0</span>], issue_saved_bits};
    issue_fifo_wdata.is_rvc           = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">issue_fifo_wdata.expt.addr_offset = <span class="hljs-number">2</span>;</span>
</code></pre></div><p>xtvalを生成するとき、オフセットを足します ( リスト27、 リスト28 )。</p><p><span class="caption">▼リスト18.27: 命令アドレスにオフセットを足す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/486dc062b1d861df65d24eed6ba7cb486bf1b2f9~1..486dc062b1d861df65d24eed6ba7cb486bf1b2f9#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>exq_wdata.expt.valid = <span class="hljs-number">1</span>;
exq_wdata.expt.cause = CsrCause::INSTRUCTION_PAGE_FAULT;
exq_wdata.expt.value = ids_pc <span class="custom-hl-bold">+ {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">3</span>, i_membus.expt.addr_offset}</span>;
</code></pre></div><p><span class="caption">▼リスト18.28: ロードストア命令のメモリアドレスにオフセットを足す (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/486dc062b1d861df65d24eed6ba7cb486bf1b2f9~1..486dc062b1d861df65d24eed6ba7cb486bf1b2f9#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_value: UIntX = <span class="hljs-keyword">switch</span> {
    expt_info.valid                             : expt_info.value,
    expt_cause == CsrCause::ILLEGAL_INSTRUCTION : {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - $bits(Inst), inst_bits},
    expt_cause == CsrCause::LOAD_PAGE_FAULT     : mem_addr <span class="custom-hl-bold">+ {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">3</span>, membus.expt.addr_offset}</span>,
    expt_cause == CsrCause::STORE_AMO_PAGE_FAULT: mem_addr <span class="custom-hl-bold">+ {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">3</span>, membus.expt.addr_offset}</span>,
    <span class="hljs-keyword">default</span>                                     : <span class="hljs-number">0</span>
};
</code></pre></div><h2 id="satpレジスタの作成" tabindex="-1">satpレジスタの作成 <a class="header-anchor" href="#satpレジスタの作成" aria-label="Permalink to “satpレジスタの作成”">​</a></h2><p>satpレジスタを実装します ( リスト29、 リスト30、 リスト31、 リスト32、 リスト33 )。 すべてのフィールドを読み書きできるように設定して、 値を<code>0</code>でリセットします。</p><p><span class="caption">▼リスト18.29: satpレジスタを作成する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> satp      : UIntX ;
</code></pre></div><p><span class="caption">▼リスト18.30: satpレジスタを0でリセットする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>satp       = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト18.31: rdataにsatpレジスタの値を設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SATP      : satp,
</code></pre></div><p><span class="caption">▼リスト18.32: 書き込みマスクの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SATP_WMASK      : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_ffff</span>;
</code></pre></div><p><span class="caption">▼リスト18.33: wmaskに書き込みマスクを設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SATP      : SATP_WMASK,
</code></pre></div><p>satpレジスタは、 MODEフィールドに書き込もうとしている値がサポートしないMODEなら、 satpレジスタの変更を全ビットについて無視すると定められています。</p><p>本章ではBareとSv39だけをサポートするため、 MODEには<code>0</code>と<code>8</code>のみ書き込めるようにして、 それ以外の値を書き込もうとしたらsatpレジスタへの書き込みを無視します ( リスト34、 リスト35 )。</p><p><span class="caption">▼リスト18.34: satに書き込む値を生成する関数 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> validate_satp (
    satp : <span class="hljs-keyword">input</span> UIntX,
    wdata: <span class="hljs-keyword">input</span> UIntX,
) -&gt; UIntX {
    <span class="hljs-comment">// mode</span>
    <span class="hljs-keyword">if</span> wdata[<span class="hljs-keyword">msb</span>-:<span class="hljs-number">4</span>] != <span class="hljs-number">0</span> &amp;&amp; wdata[<span class="hljs-keyword">msb</span>-:<span class="hljs-number">4</span>] != <span class="hljs-number">8</span> {
        <span class="hljs-keyword">return</span> satp;
    }
    <span class="hljs-keyword">return</span> wdata;
}
</code></pre></div><p><span class="caption">▼リスト18.35: satpレジスタに書き込む (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4~1..d6663976edd43c1ac4bcbda4eeb7252cd3dcfdb4#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SATP      : satp       = validate_satp(satp, wdata);
</code></pre></div><h2 id="mstatusのmxr、sum、mprvビットの実装" tabindex="-1">mstatusのMXR、SUM、MPRVビットの実装 <a class="header-anchor" href="#mstatusのmxr、sum、mprvビットの実装" aria-label="Permalink to “mstatusのMXR、SUM、MPRVビットの実装”">​</a></h2><p>mstatusレジスタのMXR、SUM、MPRVビットを変更できるようにします ( リスト36、 リスト37 )。</p><p><span class="caption">▼リスト18.36: 書き込みマスクの変更 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/303ba0a104355b7b05f6bf58bae15049e14be976~1..303ba0a104355b7b05f6bf58bae15049e14be976#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_006</span><span class="custom-hl-bold">e</span>_19aa <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト18.37: 書き込みマスクの変更 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/303ba0a104355b7b05f6bf58bae15049e14be976~1..303ba0a104355b7b05f6bf58bae15049e14be976#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_000</span><span class="custom-hl-bold">c</span>_0122 <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p>それぞれのビットを示す変数を作成します ( リスト38、 リスト39 )。</p><p><span class="caption">▼リスト18.38: mstatusのMXR、SUM、MPRVビットを示す変数を作成する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/303ba0a104355b7b05f6bf58bae15049e14be976~1..303ba0a104355b7b05f6bf58bae15049e14be976#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mstatus_mxr : <span class="hljs-keyword">logic</span>    = mstatus[<span class="hljs-number">19</span>];
<span class="hljs-keyword">let</span> mstatus_sum : <span class="hljs-keyword">logic</span>    = mstatus[<span class="hljs-number">18</span>];
<span class="hljs-keyword">let</span> mstatus_mprv: <span class="hljs-keyword">logic</span>    = mstatus[<span class="hljs-number">17</span>];
</code></pre></div><p>mstatus.MPRVは、M-mode以外のモードに戻るときに<code>0</code>に設定されると定められています。 そのため、<code>trap_mode_next</code>を確認して<code>0</code>を設定します。</p><p><span class="caption">▼リスト18.39: mstatus.MPRVをMRET、SRET命令で0に設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/303ba0a104355b7b05f6bf58bae15049e14be976~1..303ba0a104355b7b05f6bf58bae15049e14be976#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> trap_return {
    <span class="custom-hl-bold"><span class="hljs-comment">// set mstatus.mprv = 0 when new mode != M-mode</span></span>
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> trap_mode_next &lt;: PrivMode::M {</span>
    <span class="custom-hl-bold">    mstatus[<span class="hljs-number">17</span>] = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">}</span>
    <span class="hljs-keyword">if</span> is_mret {
</code></pre></div><h2 id="アドレス変換モジュール-ptw-の実装" tabindex="-1">アドレス変換モジュール(PTW)の実装 <a class="header-anchor" href="#アドレス変換モジュール-ptw-の実装" aria-label="Permalink to “アドレス変換モジュール(PTW)の実装”">​</a></h2><p>ページテーブルエントリをフェッチしてアドレス変換を行うptwモジュールを作成します。 まず、MODEがBareのとき(仮想アドレス = 物理アドレス)の動作を実装し、 Sv39を<a href="./24-impl-paging.html">「18.9 Sv39の実装」</a>で実装します。</p><h3 id="csrのインターフェースを実装する" tabindex="-1">CSRのインターフェースを実装する <a class="header-anchor" href="#csrのインターフェースを実装する" aria-label="Permalink to “CSRのインターフェースを実装する”">​</a></h3><p>ページングで使用するCSRを、csrunitモジュールからptwモジュールに渡すためのインターフェースを定義します。</p><p><code>src/ptw_ctrl_if.veryl</code>を作成し、次のように記述します (リスト40)。</p><p><span class="caption">▼リスト18.40: ptw_ctrl_if.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-ba3da29ff5998250e8bc14fd0c49d19d26129a864886b9a8d7a487e4e8b08266">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">interface</span> ptw_ctrl_if {
    <span class="hljs-keyword">var</span> priv: PrivMode;
    <span class="hljs-keyword">var</span> satp: UIntX   ;
    <span class="hljs-keyword">var</span> mxr : <span class="hljs-keyword">logic</span>   ;
    <span class="hljs-keyword">var</span> sum : <span class="hljs-keyword">logic</span>   ;
    <span class="hljs-keyword">var</span> mprv: <span class="hljs-keyword">logic</span>   ;
    <span class="hljs-keyword">var</span> mpp : PrivMode;

    <span class="hljs-keyword">modport</span> master {
        priv: <span class="hljs-keyword">output</span>,
        satp: <span class="hljs-keyword">output</span>,
        mxr : <span class="hljs-keyword">output</span>,
        sum : <span class="hljs-keyword">output</span>,
        mprv: <span class="hljs-keyword">output</span>,
        mpp : <span class="hljs-keyword">output</span>,
    }

    <span class="hljs-keyword">modport</span> slave {
        is_enabled: <span class="hljs-keyword">import</span>,
        ..<span class="hljs-keyword">converse</span>(master)
    }

    <span class="hljs-keyword">function</span> is_enabled (
        is_inst: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>,
    ) -&gt; <span class="hljs-keyword">logic</span> {
        <span class="hljs-keyword">if</span> satp[<span class="hljs-keyword">msb</span>-:<span class="hljs-number">4</span>] == <span class="hljs-number">0</span> {
            <span class="hljs-keyword">return</span> <span class="hljs-number">0</span>;
        }
        <span class="hljs-keyword">if</span> is_inst {
            <span class="hljs-keyword">return</span> priv &lt;= PrivMode::S;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">return</span> (<span class="hljs-keyword">if</span> mprv ? mpp : priv) &lt;= PrivMode::S;
        }
    }
}
</code></pre></div><p>is_enabledは、CSRとアクセス目的からページングがページングが有効かどうかを判定する関数です。 Bareかどうかを判定した後に、命令フェッチかどうか(<code>is_inst</code>)によって分岐しています。 命令フェッチのときはS-mode以下の特権レベルのときにページングが有効になります。 ロードストアのとき、mstatus.MPRVが<code>1</code>ならmstatus.MPP、<code>0</code>なら現在の特権レベルがS-mode以下ならページングが有効になります。</p><h3 id="bareだけに対応するアドレス変換モジュールを実装する" tabindex="-1">Bareだけに対応するアドレス変換モジュールを実装する <a class="header-anchor" href="#bareだけに対応するアドレス変換モジュールを実装する" aria-label="Permalink to “Bareだけに対応するアドレス変換モジュールを実装する”">​</a></h3><p><code>src/ptw.veryl</code>を作成し、次のようなポートを記述します (リスト41)。</p><p><span class="caption">▼リスト18.41: ポートの定義 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> ptw (
    clk    : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>             ,
    rst    : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>             ,
    is_inst: <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>             ,
    slave  : <span class="hljs-keyword">modport</span> Membus::slave     ,
    master : <span class="hljs-keyword">modport</span> Membus::master    ,
    ctrl   : <span class="hljs-keyword">modport</span> ptw_ctrl_if::slave,
) {
</code></pre></div><p><code>slave</code>はcoreモジュール側からの仮想アドレスによる要求を受け付けるためのインターフェースです。 <code>master</code>はmmio_conterollerモジュール側に物理アドレスによるアクセスを行うためのインターフェースです。</p><p><code>is_inst</code>を使い、ページングが有効かどうか判定します (リスト42)。</p><p><span class="caption">▼リスト18.42: ページングが有効かどうかを判定する (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> paging_enabled: <span class="hljs-keyword">logic</span> = ctrl.is_enabled(is_inst);
</code></pre></div><p>状態の管理のために<code>State</code>型を定義します (リスト43)。</p><p><span class="caption">▼リスト18.43: 状態の定義 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> State {
    IDLE,
    EXECUTE_READY,
    EXECUTE_VALID,
}

<span class="hljs-keyword">var</span> state: State;
</code></pre></div><dl><dt>\`State::IDLE\`</dt><dd> \`slave\`から要求を受け付け、\`master\`に物理アドレスでアクセスします。 \`master\`の\`ready\`が\`1\`なら\`State::EXECUTE_VALID\`、 \`0\`なら\`EXECUTE_READY\`に状態を移動します。 </dd><dt>\`State::EXECUTE_READY\`</dt><dd> \`master\`に物理アドレスでメモリアクセスを要求し続けます。 \`master\`の\`ready\`が\`1\`なら状態を\`State::EXECUTE_VALID\`に移動します。 </dd><dt>\`State::EXECUTE_VALID\`</dt><dd> \`master\`からの結果を待ちます。 \`master\`の\`rvalid\`が\`1\`のとき、 \`State::IDLE\`と同じように\`slave\`からの要求を受け付けます。 \`slave\`が何も要求していないなら、状態を\`State::IDLE\`に移動します。 </dd></dl><p><code>slave</code>からの要求を保存しておくためのインターフェースをインスタンス化します (リスト44)。</p><p><span class="caption">▼リスト18.44: slaveを保存するためのインターフェースをインスタンス化する (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> slave_saved: Membus;
</code></pre></div><p>状態に基づいて、<code>master</code>に要求を割り当てます ( リスト45、 リスト46 )。 <code>State::EXECUTE_READY</code>で<code>master</code>に要求を割り当てるとき、 <code>physical_addr</code>レジスタの値をアドレスに割り当てるようにします。</p><p><span class="caption">▼リスト18.45: 物理アドレスを保存するためのレジスタを作成する (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> physical_addr: Addr;
</code></pre></div><p><span class="caption">▼リスト18.46: masterに要求を割り当てる (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> assign_master (
    addr : <span class="hljs-keyword">input</span> Addr                        ,
    wen  : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>                       ,
    wdata: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt;    ,
    wmask: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH / <span class="hljs-number">8</span>&gt;,
) {
    master.valid = <span class="hljs-number">1</span>;
    master.addr  = addr;
    master.wen   = wen;
    master.wdata = wdata;
    master.wmask = wmask;
}

<span class="hljs-keyword">function</span> accept_request_comb () {
    <span class="hljs-keyword">if</span> slave.ready &amp;&amp; slave.valid &amp;&amp; !paging_enabled {
        assign_master(slave.addr, slave.wen, slave.wdata, slave.wmask);
    }
}

<span class="hljs-keyword">always_comb</span> {
    master.valid = <span class="hljs-number">0</span>;
    master.addr  = <span class="hljs-number">0</span>;
    master.wen   = <span class="hljs-number">0</span>;
    master.wdata = <span class="hljs-number">0</span>;
    master.wmask = <span class="hljs-number">0</span>;

    <span class="hljs-keyword">case</span> state {
        State::IDLE         : accept_request_comb();
        State::EXECUTE_READY: assign_master      (physical_addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
        State::EXECUTE_VALID: <span class="hljs-keyword">if</span> master.rvalid {
            accept_request_comb();
        }
        <span class="hljs-keyword">default</span>: {}
    }
}
</code></pre></div><p>状態に基づいて、<code>ready</code>と結果を<code>slave</code>に割り当てます (リスト47)。</p><p><span class="caption">▼リスト18.47: slaveに結果を割り当てる (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    slave.ready  = <span class="hljs-number">0</span>;
    slave.rvalid = <span class="hljs-number">0</span>;
    slave.rdata  = <span class="hljs-number">0</span>;
    slave.expt   = <span class="hljs-number">0</span>;

    <span class="hljs-keyword">case</span> state {
        State::IDLE         : slave.ready = <span class="hljs-number">1</span>;
        State::EXECUTE_VALID: {
            slave.ready  = master.rvalid;
            slave.rvalid = master.rvalid;
            slave.rdata  = master.rdata;
            slave.expt   = master.expt;
        }
        <span class="hljs-keyword">default</span>: {}
    }
}
</code></pre></div><p>状態を遷移する処理を記述します (リスト48)。 要求を受け入れるとき、<code>slave_saved</code>に要求を保存します。</p><p><span class="caption">▼リスト18.48: 状態を遷移する (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> accept_request_ff () {
    slave_saved.valid = slave.ready &amp;&amp; slave.valid;
    <span class="hljs-keyword">if</span> slave.ready &amp;&amp; slave.valid {
        slave_saved.addr  = slave.addr;
        slave_saved.wen   = slave.wen;
        slave_saved.wdata = slave.wdata;
        slave_saved.wmask = slave.wmask;
        <span class="hljs-keyword">if</span> paging_enabled {
            <span class="hljs-comment">// TODO</span>
        } <span class="hljs-keyword">else</span> {
            state         = <span class="hljs-keyword">if</span> master.ready ? State::EXECUTE_VALID : State::EXECUTE_READY;
            physical_addr = slave.addr;
        }
    } <span class="hljs-keyword">else</span> {
        state = State::IDLE;
    }
}

<span class="hljs-keyword">function</span> on_clock () {
    <span class="hljs-keyword">case</span> state {
        State::IDLE         : accept_request_ff();
        State::EXECUTE_READY: <span class="hljs-keyword">if</span> master.ready {
            state = State::EXECUTE_VALID;
        }
        State::EXECUTE_VALID: <span class="hljs-keyword">if</span> master.rvalid {
            accept_request_ff();
        }
        <span class="hljs-keyword">default</span>: {}
    }
}

<span class="hljs-keyword">function</span> on_reset () {
    state             = State::IDLE;
    physical_addr     = <span class="hljs-number">0</span>;
    slave_saved.valid = <span class="hljs-number">0</span>;
    slave_saved.addr  = <span class="hljs-number">0</span>;
    slave_saved.wen   = <span class="hljs-number">0</span>;
    slave_saved.wdata = <span class="hljs-number">0</span>;
    slave_saved.wmask = <span class="hljs-number">0</span>;
}

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        on_reset();
    } <span class="hljs-keyword">else</span> {
        on_clock();
    }
}
</code></pre></div><h3 id="ptwモジュールをインスタンス化する" tabindex="-1">ptwモジュールをインスタンス化する <a class="header-anchor" href="#ptwモジュールをインスタンス化する" aria-label="Permalink to “ptwモジュールをインスタンス化する”">​</a></h3><p>topモジュールで、ptwモジュールをインスタンス化します。</p><p>ptwモジュールはmmio_controllerモジュールの前で仮想アドレスを物理アドレスに変換するモジュールです。 ptwモジュールとmmio_controllerモジュールの間のインターフェースを作成します (リスト49)。</p><p><span class="caption">▼リスト18.49: ptwモジュールとmmio_controllerモジュールの間のインターフェースを作成する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> ptw_membus     : Membus;
</code></pre></div><p>調停処理をptwモジュール向けのものに変更します (リスト50)。</p><p><span class="caption">▼リスト18.50: 調停処理をptwモジュール向けのものに変更する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        memarb_last_i = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> <span class="custom-hl-bold">ptw</span>_membus.ready {
            memarb_last_i = !d_membus.valid;
        }
    }
}

<span class="hljs-keyword">always_comb</span> {
    i_membus.ready  = <span class="custom-hl-bold">ptw</span>_membus.ready &amp;&amp; !d_membus.valid;
    i_membus.rvalid = <span class="custom-hl-bold">ptw</span>_membus.rvalid &amp;&amp; memarb_last_i;
    i_membus.rdata  = <span class="custom-hl-bold">ptw</span>_membus.rdata;
    i_membus.expt   = <span class="custom-hl-bold">ptw</span>_membus.expt;

    d_membus.ready  = <span class="custom-hl-bold">ptw</span>_membus.ready;
    d_membus.rvalid = <span class="custom-hl-bold">ptw</span>_membus.rvalid &amp;&amp; !memarb_last_i;
    d_membus.rdata  = <span class="custom-hl-bold">ptw</span>_membus.rdata;
    d_membus.expt   = <span class="custom-hl-bold">ptw</span>_membus.expt;

    <span class="custom-hl-bold">ptw</span>_membus.valid = i_membus.valid | d_membus.valid;
    <span class="hljs-keyword">if</span> d_membus.valid {
        <span class="custom-hl-bold">ptw</span>_membus.addr  = d_membus.addr;
        <span class="custom-hl-bold">ptw</span>_membus.wen   = d_membus.wen;
        <span class="custom-hl-bold">ptw</span>_membus.wdata = d_membus.wdata;
        <span class="custom-hl-bold">ptw</span>_membus.wmask = d_membus.wmask;
    } <span class="hljs-keyword">else</span> {
        <span class="custom-hl-bold">ptw</span>_membus.addr  = i_membus.addr;
        <span class="custom-hl-bold">ptw</span>_membus.wen   = <span class="hljs-number">0</span>; <span class="hljs-comment">// 命令フェッチは常に読み込み</span>
        <span class="custom-hl-bold">ptw</span>_membus.wdata = &#39;x;
        <span class="custom-hl-bold">ptw</span>_membus.wmask = &#39;x;
    }
}
</code></pre></div><p>今処理している要求、 または今のクロックから処理し始める要求が命令フェッチによるものか判定する変数を作成します (リスト51)。</p><p><span class="caption">▼リスト18.51: ptwモジュールが処理する要求が命令フェッチによるものかを判定する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> ptw_is_inst  : <span class="hljs-keyword">logic</span> = (i_membus.ready &amp;&amp; i_membus.valid) || <span class="hljs-comment">// inst ack or</span>
 !(d_membus.ready &amp;&amp; d_membus.valid) &amp;&amp; memarb_last_i; <span class="hljs-comment">// data not ack &amp; last ack is inst</span>
</code></pre></div><p>ptwモジュールをインスタンス化します (リスト52)。</p><p><span class="caption">▼リスト18.52: ptwモジュールをインスタンス化する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> ptw_ctrl: ptw_ctrl_if;
<span class="hljs-keyword">inst</span> paging_unit: ptw (
    clk                 ,
    rst                 ,
    is_inst: ptw_is_inst,
    slave  : ptw_membus ,
    master : mmio_membus,
    ctrl   : ptw_ctrl   ,
);
</code></pre></div><p>csrunitモジュールとptwモジュールを<code>ptw_ctrl_if</code>インターフェースで接続するために、 coreモジュールにポートを追加します ( リスト53、 リスト54 )。</p><p><span class="caption">▼リスト18.53: coreモジュールにptw_ctrl_ifインターフェースを追加する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> core (
    clk     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>               ,
    rst     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>               ,
    i_membus: <span class="hljs-keyword">modport</span> core_inst_if::master,
    d_membus: <span class="hljs-keyword">modport</span> core_data_if::master,
    led     : <span class="hljs-keyword">output</span>  UIntX               ,
    aclint  : <span class="hljs-keyword">modport</span> aclint_if::slave    ,
    <span class="custom-hl-bold">ptw_ctrl: <span class="hljs-keyword">modport</span> ptw_ctrl_if::master ,</span>
) {
</code></pre></div><p><span class="caption">▼リスト18.54: ptw_ctrl_ifインターフェースを割り当てる (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk                      ,
    rst                      ,
    i_membus: i_membus_core  ,
    d_membus: d_membus_core  ,
    led                      ,
    aclint  : aclint_core_bus,
    <span class="custom-hl-bold">ptw_ctrl                 ,</span>
);
</code></pre></div><p>csrunitモジュールにポートを追加し、CSRを割り当てます ( リスト55、 リスト56、 リスト57 )。</p><p><span class="caption">▼リスト18.55: csunitモジュールにptw_ctrl_ifインターフェースを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    membus     : <span class="hljs-keyword">modport</span> core_data_if::master    ,
    <span class="custom-hl-bold">ptw_ctrl   : <span class="hljs-keyword">modport</span> ptw_ctrl_if::master     ,</span>
) {
</code></pre></div><p><span class="caption">▼リスト18.56: csrunitモジュールのインスタンスにptw_ctrl_ifインターフェースを割り当てる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    membus     : d_membus             ,
    <span class="custom-hl-bold">ptw_ctrl                          ,</span>
);
</code></pre></div><p><span class="caption">▼リスト18.57: インターフェースにCSRの値を割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cdacf2d036ec6ffc943fc03ac74413d6982ff8dd~1..cdacf2d036ec6ffc943fc03ac74413d6982ff8dd#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    ptw_ctrl.priv = mode;
    ptw_ctrl.satp = satp;
    ptw_ctrl.mxr  = mstatus_mxr;
    ptw_ctrl.sum  = mstatus_sum;
    ptw_ctrl.mprv = mstatus_mprv;
    ptw_ctrl.mpp  = mstatus_mpp;
}
</code></pre></div><h2 id="sv39の実装" tabindex="-1">Sv39の実装 <a class="header-anchor" href="#sv39の実装" aria-label="Permalink to “Sv39の実装”">​</a></h2><p>ptwモジュールに、Sv39を実装します。 ここで定義する関数は、コメントと<a href="./24-impl-paging.html">「18.3 Sv39のアドレス変換」</a>を参考に動作を確認してください。</p><h3 id="定数の定義" tabindex="-1">定数の定義 <a class="header-anchor" href="#定数の定義" aria-label="Permalink to “定数の定義”">​</a></h3><p>ptwモジュールで使用する定数と関数を実装します。</p><p><code>src/sv39util.veryl</code>を作成し、次のように記述します (リスト58)。 定数は<a href="./24-impl-paging.html">「18.3 Sv39のアドレス変換」</a>で使用しているものと同じです。</p><p><span class="caption">▼リスト18.58: sv39util.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">package</span> sv39util {
    <span class="hljs-keyword">const</span> PAGESIZE: <span class="hljs-keyword">u32</span>      = <span class="hljs-number">12</span>;
    <span class="hljs-keyword">const</span> PTESIZE : <span class="hljs-keyword">u32</span>      = <span class="hljs-number">8</span>;
    <span class="hljs-keyword">const</span> LEVELS  : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">2</span>&gt; = <span class="hljs-number">3</span>;

    <span class="hljs-keyword">type</span> Level = <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">2</span>&gt;;

    <span class="hljs-comment">// 有効な仮想アドレスか判定する</span>
    <span class="hljs-keyword">function</span> is_valid_vaddr (
        va: <span class="hljs-keyword">input</span> Addr,
    ) -&gt; <span class="hljs-keyword">logic</span> {
        <span class="hljs-keyword">let</span> hiaddr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">26</span>&gt; = va[<span class="hljs-keyword">msb</span>:<span class="hljs-number">38</span>];
        <span class="hljs-keyword">return</span> &amp;hiaddr || &amp;~hiaddr;
    }

    <span class="hljs-comment">// 仮想アドレスのVPN[level]フィールドを取得する</span>
    <span class="hljs-keyword">function</span> vpn (
        va   : <span class="hljs-keyword">input</span> Addr ,
        level: <span class="hljs-keyword">input</span> Level,
    ) -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">9</span>&gt; {
        <span class="hljs-keyword">return</span> <span class="hljs-keyword">case</span> level {
            <span class="hljs-number">0</span>      : va[<span class="hljs-number">20</span>:<span class="hljs-number">12</span>],
            <span class="hljs-number">1</span>      : va[<span class="hljs-number">29</span>:<span class="hljs-number">21</span>],
            <span class="hljs-number">2</span>      : va[<span class="hljs-number">38</span>:<span class="hljs-number">30</span>],
            <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
        };
    }

    <span class="hljs-comment">// 最初にフェッチするPTEのアドレスを取得する</span>
    <span class="hljs-keyword">function</span> get_first_pte_address (
        satp: <span class="hljs-keyword">input</span> UIntX,
        va  : <span class="hljs-keyword">input</span> Addr ,
    ) -&gt; Addr {
        <span class="hljs-keyword">return</span> {
            <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">44</span> - PAGESIZE,
            satp[<span class="hljs-number">43</span>:<span class="hljs-number">0</span>],
            vpn(va, <span class="hljs-number">2</span>),
            <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> $clog2(PTESIZE)
        };
    }
}
</code></pre></div><h3 id="pteの定義" tabindex="-1">PTEの定義 <a class="header-anchor" href="#pteの定義" aria-label="Permalink to “PTEの定義”">​</a></h3><p>Sv39のPTEのビットを分かりやすく取得するために、 次のインターフェースを定義します。</p><p><code>src/pte.veryl</code>を作成し、次のように記述します (リスト59)。</p><p><span class="caption">▼リスト18.59: pte.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-259fd1758d5312bfecd7c564016b28fdf09aaa9ff7822ed5d891a9ccc02ae337">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> sv39util::*;

<span class="hljs-keyword">interface</span> PTE39 {
    <span class="hljs-keyword">var</span> value: UIntX;

    <span class="hljs-keyword">function</span> v () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">0</span>]; }
    <span class="hljs-keyword">function</span> r () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">1</span>]; }
    <span class="hljs-keyword">function</span> w () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">2</span>]; }
    <span class="hljs-keyword">function</span> x () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">3</span>]; }
    <span class="hljs-keyword">function</span> u () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">4</span>]; }
    <span class="hljs-keyword">function</span> a () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">6</span>]; }
    <span class="hljs-keyword">function</span> d () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> value[<span class="hljs-number">7</span>]; }

    <span class="hljs-keyword">function</span> reserved -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">10</span>&gt; { <span class="hljs-keyword">return</span> value[<span class="hljs-number">63</span>:<span class="hljs-number">54</span>]; }

    <span class="hljs-keyword">function</span> ppn2 () -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">26</span>&gt; { <span class="hljs-keyword">return</span> value[<span class="hljs-number">53</span>:<span class="hljs-number">28</span>]; }
    <span class="hljs-keyword">function</span> ppn1 () -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">9</span>&gt; { <span class="hljs-keyword">return</span> value[<span class="hljs-number">27</span>:<span class="hljs-number">19</span>]; }
    <span class="hljs-keyword">function</span> ppn0 () -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">9</span>&gt; { <span class="hljs-keyword">return</span> value[<span class="hljs-number">18</span>:<span class="hljs-number">10</span>]; }
    <span class="hljs-keyword">function</span> ppn  () -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">44</span>&gt; { <span class="hljs-keyword">return</span> value[<span class="hljs-number">53</span>:<span class="hljs-number">10</span>]; }
}
</code></pre></div><p>PTEの値を使った関数を定義します (リスト60)。</p><p><span class="caption">▼リスト18.60: PTEの値を使った関数を定義する (pte.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// leaf PTEか判定する</span>
<span class="hljs-keyword">function</span> is_leaf () -&gt; <span class="hljs-keyword">logic</span> { <span class="hljs-keyword">return</span> r() || x(); }

<span class="hljs-comment">// leaf PTEのとき、PPNがページサイズに整列されているかどうかを判定する</span>
<span class="hljs-keyword">function</span> is_ppn_aligned (
    level: <span class="hljs-keyword">input</span> Level,
) -&gt; <span class="hljs-keyword">logic</span> {
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">case</span> level {
        <span class="hljs-number">0</span>      : <span class="hljs-number">1</span>,
        <span class="hljs-number">1</span>      : ppn0() == <span class="hljs-number">0</span>,
        <span class="hljs-number">2</span>      : ppn1() == <span class="hljs-number">0</span> &amp;&amp; ppn0() == <span class="hljs-number">0</span>,
        <span class="hljs-keyword">default</span>: <span class="hljs-number">1</span>,
    };
}

<span class="hljs-comment">// 有効なPTEか判定する</span>
<span class="hljs-keyword">function</span> is_valid (
    level: <span class="hljs-keyword">input</span> Level,
) -&gt; <span class="hljs-keyword">logic</span> {
    <span class="hljs-keyword">if</span> !v() || reserved() != <span class="hljs-number">0</span> || !r() &amp;&amp; w() {
        <span class="hljs-keyword">return</span> <span class="hljs-number">0</span>;
    }
    <span class="hljs-keyword">if</span> is_leaf() &amp;&amp; !is_ppn_aligned(level) {
        <span class="hljs-keyword">return</span> <span class="hljs-number">0</span>;
    }
    <span class="hljs-keyword">if</span> !is_leaf() &amp;&amp; level == <span class="hljs-number">0</span> {
        <span class="hljs-keyword">return</span> <span class="hljs-number">0</span>;
    }
    <span class="hljs-keyword">return</span> <span class="hljs-number">1</span>;
}

<span class="hljs-comment">// 次のlevelのPTEのアドレスを得る</span>
<span class="hljs-keyword">function</span> get_next_pte_addr (
    level: <span class="hljs-keyword">input</span> Level,
    va   : <span class="hljs-keyword">input</span> Addr ,
) -&gt; Addr {
    <span class="hljs-keyword">return</span> {
        <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">44</span> - PAGESIZE,
        ppn(),
        vpn(va, level - <span class="hljs-number">1</span>),
        <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> $clog2(PTESIZE)
    };
}

<span class="hljs-comment">// PTEと仮想アドレスから物理アドレスを生成する</span>
<span class="hljs-keyword">function</span> get_physical_address (
    level: <span class="hljs-keyword">input</span> Level,
    va   : <span class="hljs-keyword">input</span> Addr ,
) -&gt; Addr {
    <span class="hljs-keyword">return</span> {
        <span class="hljs-number">8&#39;b0</span>, ppn2(), <span class="hljs-keyword">case</span> level {
            <span class="hljs-number">0</span>: {
                ppn1(), ppn0()
            },
            <span class="hljs-number">1</span>: {
                ppn1(), vpn(va, <span class="hljs-number">0</span>)
            },
            <span class="hljs-number">2</span>: {
                vpn(va, <span class="hljs-number">1</span>), vpn(va, <span class="hljs-number">0</span>)
            },
            <span class="hljs-keyword">default</span>: <span class="hljs-number">18&#39;b0</span>,
        }, va[<span class="hljs-number">11</span>:<span class="hljs-number">0</span>]
    };
}

<span class="hljs-comment">// A、Dビットを更新する必要があるかを判定する</span>
<span class="hljs-keyword">function</span> need_update_ad (
    wen: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>,
) -&gt; <span class="hljs-keyword">logic</span> {
    <span class="hljs-keyword">return</span> !a() || wen &amp;&amp; !d();
}

<span class="hljs-comment">// A, Dビットを更新したPTEの下位8ビットを生成する</span>
<span class="hljs-keyword">function</span> get_updated_ad (
    wen: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>,
) -&gt; <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">8</span>&gt; {
    <span class="hljs-keyword">let</span> a: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">8</span>&gt; = <span class="hljs-number">1</span> &lt;&lt; <span class="hljs-number">6</span>;
    <span class="hljs-keyword">let</span> d: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">8</span>&gt; = wen <span class="hljs-keyword">as</span> <span class="hljs-keyword">u8</span> &lt;&lt; <span class="hljs-number">7</span>;
    <span class="hljs-keyword">return</span> value[<span class="hljs-number">7</span>:<span class="hljs-number">0</span>] | a | d;
}
</code></pre></div><h3 id="ptwモジュールの実装" tabindex="-1">ptwモジュールの実装 <a class="header-anchor" href="#ptwモジュールの実装" aria-label="Permalink to “ptwモジュールの実装”">​</a></h3><p>sv39utilパッケージをimportします (リスト61)。</p><p><span class="caption">▼リスト18.61: sv39utilパッケージをimportする (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> sv39util::*;
</code></pre></div><p>PTE39インターフェースをインスタンス化します (リスト62)。 <code>value</code>には<code>master</code>のロード結果を割り当てます。</p><p><span class="caption">▼リスト18.62: PTE39インターフェースをインスタンス化する (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> pte      : PTE39;
<span class="hljs-keyword">assign</span> pte.value = master.rdata;
</code></pre></div><p><img src="`+m+`" alt="状態の遷移図 (点線の状態で新しく要求を受け付け、二重丸の状態で結果を返す)"> 仮想アドレスを変換するための状態を追加します (リスト63)。 本章ではページングが有効な時に、 <code>state</code>が図12のように遷移するようにします。</p><p><span class="caption">▼リスト18.63: 状態の定義 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> State {
    IDLE,
    <span class="custom-hl-bold">WALK_READY,</span>
    <span class="custom-hl-bold">WALK_VALID,</span>
    <span class="custom-hl-bold">SET_AD,</span>
    EXECUTE_READY,
    EXECUTE_VALID,
    <span class="custom-hl-bold">PAGE_FAULT,</span>
}
</code></pre></div><p>現在のPTEのlevel(<code>level</code>)、 PTEのアドレス(<code>taddr</code>)、 要求によって更新されるPTEの下位8ビット(<code>wdata_ad</code>)を格納するためのレジスタを定義します ( リスト64、 リスト65 )。</p><p><span class="caption">▼リスト18.64: レジスタの定義 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> physical_addr: Addr    ;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> taddr        : Addr    ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> level        : Level   ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> wdata_ad     : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">8</span>&gt;;</span>
</code></pre></div><p><span class="caption">▼リスト18.65: レジスタをリセットする (ptw.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> on_reset () {
    state             = State::IDLE;
    physical_addr     = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">taddr             = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">level             = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">wdata_ad          = <span class="hljs-number">0</span>;</span>
</code></pre></div><p>PTEのフェッチとA、Dビットの更新のために<code>master</code>に要求を割り当てます (リスト66)。 PTEは<code>taddr</code>を使ってアクセスし、 A、Dビットの更新では下位8ビットのみの書き込みマスクを設定します。</p><p><span class="caption">▼リスト18.66: masterに要求を割り当てる (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> state {
    State::IDLE      : accept_request_comb();
    <span class="custom-hl-bold">State::WALK_READY: assign_master      (taddr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);</span>
    <span class="custom-hl-bold">State::SET_AD    : assign_master      (taddr, <span class="hljs-number">1</span>, <span class="hljs-comment">// wen = 1</span></span>
    <span class="custom-hl-bold"> {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> MEMBUS_DATA_WIDTH - <span class="hljs-number">8</span>, wdata_ad}, <span class="hljs-comment">// wdata</span></span>
    <span class="custom-hl-bold"> {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN / <span class="hljs-number">8</span> - <span class="hljs-number">1</span>, <span class="hljs-number">1&#39;b1</span>} <span class="hljs-comment">// wmask</span></span>
    <span class="custom-hl-bold">);</span>
    State::EXECUTE_READY: assign_master(physical_addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
    State::EXECUTE_VALID: <span class="hljs-keyword">if</span> master.rvalid {
        accept_request_comb();
    }
    <span class="hljs-keyword">default</span>: {}
}
</code></pre></div><p><code>slave</code>への結果の割り当てで、ページフォルト例外が発生していた場合の結果を割り当てます (リスト67)。</p><p><span class="caption">▼リスト18.67: ページフォルト例外のときの結果を割り当てる (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::PAGE_FAULT: {
    slave.rvalid          = <span class="hljs-number">1</span>;
    slave.expt.valid      = <span class="hljs-number">1</span>;
    slave.expt.page_fault = <span class="hljs-number">1</span>;
}
</code></pre></div><p>ページングが有効なときに要求を受け入れる動作を実装します (リスト68)。 仮想アドレスが有効かどうかでページフォルト例外を判定し、<code>taddr</code>レジスタに最初のPTEのアドレスを割り当てます。 <code>level</code>の初期値は<code>LEVELS - 1</code>とします。</p><p><span class="caption">▼リスト18.68: ページングが有効なときの要求の受け入れ (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> paging_enabled {
    <span class="custom-hl-bold">state = <span class="hljs-keyword">if</span> is_valid_vaddr(slave.addr) ? State::WALK_READY : State::PAGE_FAULT;</span>
    <span class="custom-hl-bold">taddr = get_first_pte_address(ctrl.satp, slave.addr);</span>
    <span class="custom-hl-bold">level = LEVELS - <span class="hljs-number">1</span>;</span>
} <span class="hljs-keyword">else</span> {
    state         = <span class="hljs-keyword">if</span> master.ready ? State::EXECUTE_VALID : State::EXECUTE_READY;
    physical_addr = slave.addr;
}
</code></pre></div><p>ページフォルト例外が発生したとき、状態を<code>State::IDLE</code>に戻します (リスト69)。</p><p><span class="caption">▼リスト18.69: ページフォルト例外が発生したときの状態遷移 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::PAGE_FAULT: state = State::IDLE;
</code></pre></div><p>A、Dビットを更新するとき、メモリが書き込み要求を受け入れたら、状態を<code>State::EXECUTE_READY</code>に移動します (リスト70)。</p><p><span class="caption">▼リスト18.70: A、Dビットを更新したときの状態遷移 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::SET_AD: <span class="hljs-keyword">if</span> master.ready {
    state = State::EXECUTE_READY;
}
</code></pre></div><p>ページにアクセスする権限があるかをPTEと要求から判定する関数を定義します (リスト71)。 条件の詳細は<a href="./24-impl-paging.html">「18.3 Sv39のアドレス変換」</a>を確認してください。</p><p><span class="caption">▼リスト18.71: ページにアクセスする権限があるかを判定する関数 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> check_permission (
    req: <span class="hljs-keyword">modport</span> Membus::all_input,
) -&gt; <span class="hljs-keyword">logic</span> {
    <span class="hljs-keyword">let</span> priv: PrivMode = <span class="hljs-keyword">if</span> is_inst || !ctrl.mprv ? ctrl.priv : ctrl.mpp;

    <span class="hljs-comment">// U-mode access with PTE.U=0</span>
    <span class="hljs-keyword">let</span> u_u0: <span class="hljs-keyword">logic</span> = priv == PrivMode::U &amp;&amp; !pte.u();
    <span class="hljs-comment">// S-mode load/store with PTE.U=1 &amp; sum=0</span>
    <span class="hljs-keyword">let</span> sd_u1: <span class="hljs-keyword">logic</span> = !is_inst &amp;&amp; priv == PrivMode::S &amp;&amp; pte.u() &amp;&amp; !ctrl.sum;
    <span class="hljs-comment">// S-mode execute with PTE.U=1</span>
    <span class="hljs-keyword">let</span> si_u1: <span class="hljs-keyword">logic</span> = is_inst &amp;&amp; priv == PrivMode::S &amp;&amp; pte.u();

    <span class="hljs-comment">// execute without PTE.X</span>
    <span class="hljs-keyword">let</span> x: <span class="hljs-keyword">logic</span> = is_inst &amp;&amp; !pte.x();
    <span class="hljs-comment">// write without PTE.W</span>
    <span class="hljs-keyword">let</span> w: <span class="hljs-keyword">logic</span> = !is_inst &amp;&amp; req.wen &amp;&amp; !pte.w();
    <span class="hljs-comment">// read without PTE.R (MXR)</span>
    <span class="hljs-keyword">let</span> r: <span class="hljs-keyword">logic</span> = !is_inst &amp;&amp; !req.wen &amp;&amp; !pte.r() &amp;&amp; !(pte.x() &amp;&amp; ctrl.mxr);

    <span class="hljs-keyword">return</span> !(u_u0 | sd_u1 | si_u1 | x | w | r);
}
</code></pre></div><p>PTEをフェッチしてページフォルト例外を判定し、次のPTEのフェッチ、A、Dビットを更新する状態への遷移を実装します (リスト72)。</p><p><span class="caption">▼リスト18.72: PTEのフェッチとPTEの確認 (ptw.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8c2cdd7c775231bcdfbed3b4a8536527b37f3a40~1..8c2cdd7c775231bcdfbed3b4a8536527b37f3a40#diff-a52c5378935697b09ca8e4279dc7723a88ef9145fbc6490a573d5ee19c86f0b5">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::WALK_READY: <span class="hljs-keyword">if</span> master.ready {
    state = State::WALK_VALID;
}
State::WALK_VALID: <span class="hljs-keyword">if</span> master.rvalid {
    <span class="hljs-keyword">if</span> !pte.is_valid(level) {
        state = State::PAGE_FAULT;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> pte.is_leaf() {
            <span class="hljs-keyword">if</span> check_permission(slave_saved) {
                physical_addr = pte.get_physical_address(level, slave_saved.addr);
                <span class="hljs-keyword">if</span> pte.need_update_ad(slave_saved.wen) {
                    state    = State::SET_AD;
                    wdata_ad = pte.get_updated_ad(slave_saved.wen);
                } <span class="hljs-keyword">else</span> {
                    state = State::EXECUTE_READY;
                }
            } <span class="hljs-keyword">else</span> {
                state = State::PAGE_FAULT;
            }
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-comment">// read next pte</span>
            state = State::WALK_READY;
            taddr = pte.get_next_pte_addr(level, slave_saved.addr);
            level = level - <span class="hljs-number">1</span>;
        }
    }
}
</code></pre></div><p>これでSv39をptwモジュールに実装できました。</p><h2 id="sfence-vma命令の実装" tabindex="-1">SFENCE.VMA命令の実装 <a class="header-anchor" href="#sfence-vma命令の実装" aria-label="Permalink to “SFENCE.VMA命令の実装”">​</a></h2><p>SFENCE.VMA命令は、 SFENCE.VMA命令を実行する以前のストア命令がMMUに反映されたことを保証する命令です。 S-mode以上の特権レベルのときに実行できます。</p><p>基本編ではすべてのメモリアクセスを直列に行い、 仮想アドレスを変換するために毎回PTEをフェッチしなおすため、何もしない命令として定義します。</p><h3 id="sfence-vma命令をデコードする" tabindex="-1">SFENCE.VMA命令をデコードする <a class="header-anchor" href="#sfence-vma命令をデコードする" aria-label="Permalink to “SFENCE.VMA命令をデコードする”">​</a></h3><p>SFENCE.VMA命令を有効な命令としてデコードします (リスト73)。</p><p><span class="caption">▼リスト18.73: SFENCE.VMA命令を有効な命令としてデコードする (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/123262f08ceeef9b40e4b317e81a7036cae65e4b~1..123262f08ceeef9b40e4b317e81a7036cae65e4b#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>bits == <span class="hljs-number">32&#39;h10200073</span> || <span class="hljs-comment">//SRET</span>
bits == <span class="hljs-number">32&#39;h10500073</span> || <span class="hljs-comment">// WFI</span>
f7 == <span class="hljs-number">7&#39;b0001001</span> &amp;&amp; bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>] == <span class="hljs-number">0</span>, <span class="hljs-comment">// SFENCE.VMA</span>
</code></pre></div><h3 id="特権レベルの確認、mstatus-tvmを実装する" tabindex="-1">特権レベルの確認、mstatus.TVMを実装する <a class="header-anchor" href="#特権レベルの確認、mstatus-tvmを実装する" aria-label="Permalink to “特権レベルの確認、mstatus.TVMを実装する”">​</a></h3><p>S-mode未満の特権レベルでSFENCE.VMA命令を実行しようとしたとき、 Illegal instruction例外が発生します。</p><p>mstatus.TVMはS-modeのときにsatpレジスタにアクセスできるか、 SFENCE.VMA命令を実行できるかを制御するビットです。 mstatus.TVMが<code>1</code>にされているとき、Illegal instruction例外が発生します。</p><p>mstatus.TVMを書き込めるようにします (リスト74)。</p><p><span class="caption">▼リスト18.74: mstatusレジスタの書き込みマスクを変更する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/123262f08ceeef9b40e4b317e81a7036cae65e4b~1..123262f08ceeef9b40e4b317e81a7036cae65e4b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_00</span><span class="custom-hl-bold"><span class="hljs-number">7</span></span>e_19aa <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト18.75: mstatus.TVMを示す変数を作成する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/123262f08ceeef9b40e4b317e81a7036cae65e4b~1..123262f08ceeef9b40e4b317e81a7036cae65e4b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mstatus_tvm : <span class="hljs-keyword">logic</span>    = mstatus[<span class="hljs-number">20</span>];
</code></pre></div><p>特権レベルを確認して、例外を発生させます ( リスト76、 リスト77、 リスト78 )。</p><p><span class="caption">▼リスト18.76: SFENCE.VMA命令かどうかを判定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/123262f08ceeef9b40e4b317e81a7036cae65e4b~1..123262f08ceeef9b40e4b317e81a7036cae65e4b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> is_sfence_vma: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; ctrl.funct7 == <span class="hljs-number">7&#39;b0001001</span> &amp;&amp; ctrl.funct3 == <span class="hljs-number">0</span> &amp;&amp; rd_addr == <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト18.77: SFENCE.VMA命令の例外を判定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/123262f08ceeef9b40e4b317e81a7036cae65e4b~1..123262f08ceeef9b40e4b317e81a7036cae65e4b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_tvm: <span class="hljs-keyword">logic</span> = (is_sfence_vma &amp;&amp; mode &lt;: PrivMode::S) || (mstatus_tvm &amp;&amp; mode == PrivMode::S &amp;&amp; (is_wsc &amp;&amp; csr_addr == CsrAddr::SATP || is_sfence_vma));
</code></pre></div><p><span class="caption">▼リスト18.78: 例外を発生させる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/123262f08ceeef9b40e4b317e81a7036cae65e4b~1..123262f08ceeef9b40e4b317e81a7036cae65e4b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> raise_expt: <span class="hljs-keyword">logic</span> = valid &amp;&amp; (expt_info.valid || expt_write_readonly_csr || expt_csr_priv_violation || expt_zicntr_priv || expt_trap_return_priv || expt_memory_fault <span class="custom-hl-bold">|| expt_tvm</span>);
<span class="hljs-keyword">let</span> expt_cause: UIntX = <span class="hljs-keyword">switch</span> {
    expt_info.valid        : expt_info.cause,
    expt_write_readonly_csr: CsrCause::ILLEGAL_INSTRUCTION,
    expt_csr_priv_violation: CsrCause::ILLEGAL_INSTRUCTION,
    expt_zicntr_priv       : CsrCause::ILLEGAL_INSTRUCTION,
    expt_trap_return_priv  : CsrCause::ILLEGAL_INSTRUCTION,
    expt_memory_fault      : <span class="hljs-keyword">if</span> ctrl.is_load ? CsrCause::LOAD_PAGE_FAULT : CsrCause::STORE_AMO_PAGE_FAULT,
    <span class="custom-hl-bold">expt_tvm               : CsrCause::ILLEGAL_INSTRUCTION,</span>
    <span class="hljs-keyword">default</span>                : <span class="hljs-number">0</span>,
};
</code></pre></div><h2 id="パイプラインをフラッシュする" tabindex="-1">パイプラインをフラッシュする <a class="header-anchor" href="#パイプラインをフラッシュする" aria-label="Permalink to “パイプラインをフラッシュする”">​</a></h2><p>本書はパイプライン化したCPUを実装しているため、 命令フェッチは前の命令を待たずに次々に行われます。</p><h3 id="csrの変更" tabindex="-1">CSRの変更 <a class="header-anchor" href="#csrの変更" aria-label="Permalink to “CSRの変更”">​</a></h3><p>mstatusレジスタのMXR、SUM、TVMビット、 satpレジスタを書き換えたとき、 CSRを書き換える命令の後ろの命令は、 CSRの変更が反映されていない状態でアドレス変換してフェッチした命令になっている可能性があります。</p><p>CSRの書き換えをページングに反映するために、 特定のCSRを書き換えたらパイプラインをフラッシュするようにします。</p><p>csrunitモジュールに、フラッシュするためのフラグを追加します ( リスト79、 リスト80、 リスト81 )。</p><p><span class="caption">▼リスト18.79: csrunitモジュールのポートにフラッシュするためのフラグを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e31824cd74213d88935f9e9239504023c865f478~1..e31824cd74213d88935f9e9239504023c865f478#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold">flush      : <span class="hljs-keyword">output</span>  <span class="hljs-keyword">logic</span>                   ,</span>
minstret   : <span class="hljs-keyword">input</span>   UInt64                  ,
</code></pre></div><p><span class="caption">▼リスト18.80: csru_flush変数の定義 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e31824cd74213d88935f9e9239504023c865f478~1..e31824cd74213d88935f9e9239504023c865f478#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> csru_trap_return: <span class="hljs-keyword">logic</span>   ;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> csru_flush      : <span class="hljs-keyword">logic</span>   ;</span>
<span class="hljs-keyword">var</span> minstret        : UInt64  ;
</code></pre></div><p><span class="caption">▼リスト18.81: csrunitモジュールのflushフラグをcsru_flushに割り当てる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e31824cd74213d88935f9e9239504023c865f478~1..e31824cd74213d88935f9e9239504023c865f478#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold">flush      : csru_flush           ,</span>
minstret                          ,
</code></pre></div><p>satp、mstatus、sstatusレジスタが変更されるときに<code>flush</code>を<code>1</code>にします (リスト82)。</p><p><span class="caption">▼リスト18.82: satp、mstatus、sstatusレジスタが変更されるときにflushを1にする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> wsc_flush: <span class="hljs-keyword">logic</span> = is_wsc &amp;&amp; (csr_addr == CsrAddr::SATP || csr_addr == CsrAddr::MSTATUS || csr_addr == CsrAddr::SSTATUS);
<span class="hljs-keyword">assign</span> flush     = valid &amp;&amp; wsc_flush;
</code></pre></div><p><code>flush</code>が<code>1</code>のとき、制御ハザードが発生したことにしてパイプラインをフラッシュします (リスト83)。</p><p><span class="caption">▼リスト18.83: csru_flushが1のときにパイプラインをフラッシュする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e31824cd74213d88935f9e9239504023c865f478~1..e31824cd74213d88935f9e9239504023c865f478#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> control_hazard         = mems_valid &amp;&amp; (csru_raise_trap || mems_ctrl.is_jump || memq_rdata.br_taken <span class="custom-hl-bold">|| csru_flush</span>);
<span class="hljs-keyword">assign</span> control_hazard_pc_next = <span class="hljs-keyword">if</span> csru_raise_trap ? csru_trap_vector : <span class="hljs-comment">// trap</span>
 <span class="custom-hl-bold"><span class="hljs-keyword">if</span> csru_flush ? mems_pc + <span class="hljs-number">4</span> :</span> memq_rdata.jump_addr; <span class="hljs-comment">// <span class="custom-hl-bold">flush or</span> jump</span>
</code></pre></div><h3 id="fence-i命令の実装" tabindex="-1">FENCE.I命令の実装 <a class="header-anchor" href="#fence-i命令の実装" aria-label="Permalink to “FENCE.I命令の実装”">​</a></h3><p>あるアドレスにデータを書き込むとき、 データを書き込んだ後の命令が、 書き換えられたアドレスにある命令だった場合、 命令のビット列がデータが書き換えられる前のものになっている可能性があります。</p><p>FENCE.I命令は、FENCE.I命令の後の命令のフェッチ処理がストア命令の完了後に行われることを保証する命令です。 例えばユーザーのアプリケーションのプログラムをページに書き込んで実行するとき、 ページへの書き込みを反映させるために使用します。</p><p>FENCE.I命令を判定し、パイプラインをフラッシュする条件に設定します ( リスト84、 リスト85 )。</p><p><span class="caption">▼リスト18.84: FENCE.I命令かどうかを判定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1d260cef79df162e72e2d2a5fbcc41ed5716ceb9~1..1d260cef79df162e72e2d2a5fbcc41ed5716ceb9#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> is_fence_i: <span class="hljs-keyword">logic</span> = inst_bits[<span class="hljs-number">6</span>:<span class="hljs-number">0</span>] == OP_MISC_MEM &amp;&amp; ctrl.funct3 == <span class="hljs-number">3&#39;b001</span>;
</code></pre></div><p><span class="caption">▼リスト18.85: FENCE.I命令のときにflushを1にする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1d260cef79df162e72e2d2a5fbcc41ed5716ceb9~1..1d260cef79df162e72e2d2a5fbcc41ed5716ceb9#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> flush     = valid &amp;&amp; (wsc_flush <span class="custom-hl-bold">|| is_fence_i</span>);
</code></pre></div><p>riscv-testsの<code>-v-</code>を含むテストを実行し、実装している命令のテストに成功することを確認してください。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>ページテーブルをたどってアドレスを変換するのでPage Table Walkerと呼びます。アドレスを変換することをPage Table Walkと呼ぶこともあります。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>RISC-VのMMUはPMP、PMAという仕組みで物理アドレス空間へのアクセスを制限することができ、それに違反した場合にアクセスフォルト例外を発生させます。本章ではPMP、PMAを実装していないのでアクセスフォルト例外に関する機能について説明せず、実装もしません。これらの機能は応用編で実装します。 <a href="#fnref2" class="footnote-backref">↩︎</a></p></li></ol></section>`,332)])])}const P=a(y,[["render",v]]);export{C as __pageData,P as default};
