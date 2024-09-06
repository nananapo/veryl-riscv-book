# -*- coding: utf-8 -*-

##
## ReVIEW::LATEXBuilderクラスを拡張する
##

require 'review/latexbuilder'


module ReVIEW

  defined?(LATEXBuilder)  or raise "internal error: LATEXBuilder not found."


  class LATEXBuilder

    public :print, :puts

    def target_name
      "latex"
    end

    ## 章や節や項や目のタイトル
    def headline(level, label, caption)
      with_context(:headline) do
        _, anchor = headline_prefix(level)
        headname = _headline_name(level)     # 'chapter', 'section', 'subsection', ...
        headstar = _headline_star(level)     # '*' or nil
        blank() unless @output.pos == 0
        with_context(:caption) do
          print macro("#{headname}#{headstar}", compile_inline(caption))
          print "\n" unless level >= 5  # \paragraphと\subpararaphでは改行しない
        end
        if headstar && _headline_toc?(level)  # 番号はつかないけど目次には出す場合
          ## starter-heading.sty を使っているときは \addcontentsline が必要ない
          #puts "\\@ifundefined{Chapter}{\\addcontentsline{toc}{#{headname}}{#{compile_inline(caption)}}}{}"
          puts "\\ifx\\Chapter\\undefined{\\addcontentsline{toc}{#{headname}}{#{compile_inline(caption)}}}\\fi"
        end
        if _headline_chapter?(level)
          ## \Chapter直後の\addvspaceが効くように、
          ## \lastskipをいったん保存し、\labelのあとで復元する。
          puts "\\keeplastskip{"
          puts "  \\label{#{chapter_label()}}"
          puts "  \\par\\nobreak"
          puts "}"
        elsif level >= 5  # 段(Paragraph)と小段(Subparagraph)では
          nil             # 何もしない、\labelもつけない
        else
          ## \Section最後と\Subsection最初の\addvspaceが効くように、
          ## \lastskipをいったん保存し、\labelのあとで復元する。
          puts "\\keeplastskip{"
          puts "  \\label{#{sec_label(anchor)}}"
          puts "  \\label{#{label}}" if label
          puts "  \\par\\nobreak"
          puts "}"
        end
      end
    rescue
      error "unknown level: #{level}"
    end

    private

    def _headline_name(level)
      return 'part' if @chapter.is_a?(ReVIEW::Book::Part)
      return HEADLINE[level]  # 1: 'chapter', 2: 'section', ...
    end

    def _headline_star(level)
      return '*' if level > @book.config['secnolevel']
      return '*' if @chapter.number.to_s.empty? && level > 1
      return nil
    end

    def _headline_toc?(level)
      return level <= @book.config['toclevel'].to_i
    end

    def _headline_chapter?(level)
      return level == 1
    end

    public

    def nonum_begin(level, _label, caption)
      blank() unless @output.pos == 0
      with_context(:headline) do
        with_context(:caption) do
          puts macro(HEADLINE[level] + '*', compile_inline(caption))
          puts "\\ifx\\Chapter\\undefined"
          puts macro('addcontentsline', 'toc', HEADLINE[level], compile_inline(caption))
          puts "\\fi"
        end
      end
    end

    def notoc_begin(level, _label, caption)
      blank() unless @output.pos == 0
      with_context(:headline) do
        with_context(:caption) do
          puts "\\ifx\\Chapter\\undefined"
          puts macro(HEADLINE[level] + '*', compile_inline(caption))
          puts "\\else"
          puts macro(HEADLINE[level] + '*[]', compile_inline(caption))
          puts "\\fi"
        end
      end
    end

    ## テーブル
    def table(lines, id=nil, caption=nil, option=nil)
      super
    end

    def table_header(id, caption, options)
      if id.present? || caption.present?
        @table_caption = true
        pos = options[:pos] || 'h'
        star = id.present? ? '' : '*'
        s = with_context(:caption) { compile_inline(caption || '') }
        puts "\\begin{table}[#{pos}]%%#{id}"
        puts "\\centering%"
        puts macro("reviewtablecaption#{star}", s)
      end
      begin
        puts macro('label', table_label(id)) if id.present?
      rescue KeyError
        error "no such table: #{id}"
      end
    end

    alias __original_table_begin table_begin

    def table_begin(ncols, fontsize: nil)
      if fontsize
        font = FONTSIZES[fontsize]
        puts "\\def\\startertablefont{\\#{font}}" if font
      end
      __original_table_begin(ncols)
    end

    ## CSVテーブル
    def _table_hline()
      "\\hline"
    end

    def _table_bottom(hline: false)
      puts "\\hline" if hline
    end

    def _table_tr(cells, hline: false)
      s = "#{cells.join(' & ')} \\\\"
      s << " \\hline" if hline
      return s
    end

    ## 改行命令「\\」のあとに改行文字「\n」を置かない。
    ##
    ## 「\n」が置かれると、たとえば
    ##
    ##     foo@<br>{}
    ##     bar
    ##
    ## が
    ##
    ##     foo\\
    ##
    ##     bar
    ##
    ## に展開されてしまう。
    ## つまり改行のつもりが改段落になってしまう。
    def inline_br(_str)
      #"\\\\\n"   # original
      #"\\\\{}"   # これだと後続行の先頭に1/4空白が入ってしまう
      "\\\\[0pt]" # これなら後続行の先頭に1/4空白が入らない
    end

    protected


    ## コードブロック（//program, //terminal, //output）

    FONTSIZES = {
      "small"    => "small",
      "x-small"  => "footnotesize",
      "xx-small" => "scriptsize",
      "large"    => "large",
      "x-large"  => "Large",
      "xx-large" => "LARGE",
      "medium"   => "normalsize",
    }

    def _codeblock_eolmark()
      "{\\startereolmark}"
    end

    def _codeblock_indentmark()
      "{\\starterindentchar}"
    end

    LATEX_ESCAPE_TABLE = {
      '{'  => '\{',
      '}'  => '\}',
      '%'  => '\%',
      '$'  => '\$',
      '#'  => '\#',
      '&'  => '\&',
      '_'  => '\_',
      '\\' => '{\textbackslash}',
      '^'  => '{\textasciicircum}',
      '~'  => '{\textasciitilde}',
      "'"  => '{\textquotesingle}',
      '`'  => '{\textasciigrave}',
    }

    def _render_codeblock(blockname, lines, id, caption_str, opts)
      if opts['eolmark']
        eolmark = _codeblock_eolmark()   # ex: '{\startereolmark}'
      else
        eolmark = nil
      end
      #
      eol = eolmark ? "#{eolmark}\\par\n" : "\\par\n"
      lines = lines.map {|line|
        line = _parse_inline(line) {|text|
          _convert_and_escape_str(text)
        }
        if line =~ /\A\n/
          "\\mbox{}#{eol}\n"
        else
          line.gsub(/(?:\\-)?\n/, eol)
        end
      }
      #
      indent_width = opts['indent']
      if indent_width && indent_width > 0
        lines = _add_indent_mark(lines, indent_width)
      end
      #
      default_opts = _codeblock_default_options(blockname)
      opts2 = {}
      opts.each do |k, v|
        opts2[k] = v unless v == default_opts[k]
      end
      fontsize = FONTSIZES[opts['fontsize']]
      #
      environ = "starter#{blockname}"
      puts "\\begingroup"
      puts "  \\makeatletter" if fontsize
      puts "  \\def\\starter@#{blockname}@fontsize{#{fontsize}}" if fontsize
      puts "  \\makeatother"  if fontsize
      puts "  \\makeatletter" unless opts2.empty?
      opts2.each do |k, v|
        x = k.gsub(/[^a-zA-Z]/, '_')
        v = v == true ? 'Y' : v == false ? '' : v  #escape(v.to_s)
        puts "  \\edef\\starter@#{blockname}@#{x}{#{v}}"
        #puts "  \\edef\\starter@codeblock@#{x}{#{v}}"
      end
      puts "  \\makeatother"  unless opts2.empty?
      print "\\begin{#{environ}}[#{id}]{#{caption_str}}"
      print "\\startersetfoldmark{}" unless opts['foldmark']
      if opts['lineno']
        gen = LineNumberGenerator.new(opts['lineno'])
        width = opts['linenowidth'] || -1
        if width && width >= 0
          if width == 0
            last_lineno = gen.each.take(lines.length).compact.last
            width = last_lineno.to_s.length
          end
          print "\\startersetfoldindentwidth{#{'9'*(width+2)}}"
          format = "\\starterinnerlineno{%#{width}s:} "
        else
          format = "\\starterouterlineno{%s}"
        end
        buf = []
        lines.zip(gen).each do |x, n|
          buf << "#{(format % n.to_s).gsub(' ', '~')}#{x}"
        end
        print buf.join()
      else
        print lines.join()
      end
      puts "\\end{#{environ}}"
      puts "\\endgroup"
      nil
    end

    def _convert_and_escape_str(str)
      #str.gsub(/[\{\}\\\%\^\_\$\&\~]/, LATEX_ESCAPE_TABLE)
      rexp = /[\{\}\\\#\%\^\_\$\&\~\'\`]/
      cs = []
      zenkaku_rexp = ZENKAKU_CHAR_REXP
      str.each_char do |c|
        cs << (
          case c
          when / /          ; '~'
          when /\n/         ; "\n"
          when rexp         ; LATEX_ESCAPE_TABLE[c]
          when zenkaku_rexp ; "\\ZC{#{c}}"   # 全角文字
          else              ; c              # 半角文字
          end
          )
      end
      cs << "" unless cs[-1] == "\n"
      return cs.join('\\-')
    end

    ZENKAKU_CHAR_REXP = /\A[^\000-\177]\z/

    def _add_indent_mark(lines, indent_width)
      space = "~\\-"
      rexp  = /\A((?:~\\-)+)/
      #
      width = indent_width
      mark  = _codeblock_indentmark()  # ex: '{\starterindentmark}'
      indent = space * (width - 1) + mark
      nchar = space.length
      return lines.map {|line|
        line.sub(rexp) {
          m, n = ($1.length / nchar - 1).divmod width
          "#{space}#{indent * m}#{space * n}"
        }
      }
    end

    public

    def indepimage(lines, id, caption=nil, option=nil)
      ## Re:VIEW側でLATEXBuilder#indepimage()が定義されているので、それを
      ## 呼び出さないように再上書きする（つまりBuilder#indepimage()を使う）
      super
    end

    ## ・\caption{} のかわりに \reviewimagecaption{} を使うよう修正
    ## ・「scale=X」に加えて「pos=X」も受け付けるように拡張
    def _render_image(id, image_filepath, caption, opts)
      __render_image(id, image_filepath, caption, opts) do
        with_context(:caption) do
          #puts macro('caption', compile_inline(caption)) if caption.present?  # original
          puts "\\reviewimagecaption{#{compile_inline(caption)}}" if caption.present?
        end
      end
    end
    def _render_indepimage(id, image_filepath, caption, opts)
      __render_image(id, image_filepath, caption, opts) do
        with_context(:caption) do
          ## オリジナルでは「図：」という接頭辞がつくようになっている。
          #prefix = "#{I18n.t('numberless_image')}#{I18n.t('caption_prefix')}"
          #puts "\\reviewindepimagecaption{#{prefix}#{compile_inline(caption)}}"
          ## けど //indepimage の用途を考えると、つけないほうがいいはず。
          ## 「図：」必要なら自力で入れてもらうことにする。
          puts "\\reviewindepimagecaption{#{compile_inline(caption)}}"
        end if caption.present?
      end
    end

    def __render_image(id, image_filepath, caption, opts)
      width = "\\maxwidth"
      if opts[:scale]
        case (scale = opts[:scale])
        when /\A\d+\z/, /\A\d\.\d*\z/, /\A\.\d+\z/
        when /\A\d+(\.\d+)?%\z/
          scale = scale.sub(/%\z/, '').to_f / 100.0
        else
          error "scale=#{scale}: invalid scale value."
        end
        width = "#{scale}\\maxwidth"   # not '\textwidth'
      end
      #
      if opts[:width]
        case opts[:width]
        when /\A\d+\z/, /\A\d\.\d*\z/, /\A\.\d+\z/
          width = "#{opts[:width]}\\textwidth"   # not '\maxwidth'
        when /\A(\d+(\.\d+)?)%\z/
          width = "#{$1.to_f/100.0}\\textwidth"  # not '\maxwidth'
        when /\A(\d+(?:\.\d*)?)(mm|cm)\z/
          width = "#{$1}true#{$2}"  # 'mm'->'truemm', 'cm'->'truecm'
        else
          width = opts[:width]
        end
      end
      #
      metrics = ["width=#{width}"]
      metrics << "draft=#{opts[:draft]}" if opts[:draft] != nil
      #
      pos = opts[:pos] || config_starter()['image_position']
      puts "\\begin{reviewimage}[#{pos}]%%#{id}"
      puts "\\starterimageframe{%" if opts[:border]
      puts "\\includegraphics[#{metrics.join(',')}]{#{image_filepath}}%"
      puts "}%"                    if opts[:border]
      yield if block_given?
      puts "\\label{#{image_label(id)}}"
      puts "\\end{reviewimage}"
    end

    ## //imgtable
    def imgtable(lines, id, caption=nil, option=nil)
      super
    end

    def _render_imgtable(id, caption, opts)
      pos = opts['pos'] || 'h'
      puts "\\begin{table}[#{pos}]%%#{id}"
      puts "\\centering"
      yield
      puts "\\end{table}"
      blank()
    end

    def _render_imgtable_caption(caption)
      puts macro('reviewimgtablecaption', compile_inline(caption))
    end

    def _render_imgtable_label(id)
      puts macro('label', table_label(id))
    rescue ReVIEW::KeyError
      error "no such table: #{id}"
    end

    def imgtable_image(id, _caption, metric)
      metrics = parse_metric('latex', metric)
      # image is always bound here
      #puts "\\begin{reviewimage}%%#{id}"    #-
      metrics = "width=\\maxwidth" unless metrics.present?
      imagefile = @chapter.image(id).path
      puts "\\includegraphics[#{metrics}]{#{imagefile}}"
      #puts '\end{reviewimage}'              #-
    end

    ##

    def _build_secref(chap, num, title, parent_title)
      s = ""
      ## 親セクションのタイトルがあれば使う
      if parent_title && self.config_starter['secref_parenttitle']
        s << "「%s」内の" % parent_title   # TODO: I18n化
      end
      ## 対象セクションへのリンクを作成する
      if @book.config['chapterlink']
        label = "sec:" + num.gsub('.', '-')
        level = num.split('.').length
        case level
        when 2 ; s << "\\startersecref{#{title}}{#{label}}"
        when 3 ; s << "\\startersubsecref{#{title}}{#{label}}"
        when 4 ; s << "\\startersubsubsecref{#{title}}{#{label}}"
        else
          raise "#{num}: unexpected section level (expected: 2~4)."
        end
      else
        s << title
      end
      return s
    end

    ###

    public

    def ul_begin
      blank()
      puts '\begin{starteritemize}'    # instead of 'itemize'
    end

    def ul_end
      puts '\end{starteritemize}'      # instead of 'itemize'
      blank()
    end

    def ol_begin(start_num=nil)
      blank()
      puts '\begin{starterenumerate}'  # instead of 'enumerate'
      if start_num.nil?
        return true unless @ol_num
        puts "\\setcounter{enumi}{#{@ol_num - 1}}"
        @ol_num = nil
      end
    end

    def ol_end
      puts '\end{starterenumerate}'    # instead of 'enumerate'
      blank()
    end

    def ol_item_begin(lines, num)
      str = lines.join
      num = escape(num).sub(']', '\rbrack{}')
      puts "\\item[#{num}] #{str}"
    end

    def ol_item_end()
    end

    def dt(str)
      puts "\\starterdt{#{str}}%"
    end

    def dl_dd_begin()
    end

    def dl_dd_end()
    end

    ## コラム

    def column_begin(level, label, caption)
      blank()
      @doc_status[:column] = true
      puts "\\begin{reviewcolumn}\n"
      puts "\\phantomsection   % for hyperref"   #+
      if label
        puts "\\hypertarget{#{column_label(label)}}{}"
      else
        puts "\\hypertarget{#{column_label(caption)}}{}"
      end
      @doc_status[:caption] = true
      puts macro('reviewcolumnhead', nil, compile_inline(caption))
      @doc_status[:caption] = nil
      if level <= @book.config['toclevel'].to_i
        #puts "\\addcontentsline{toc}{#{HEADLINE[level]}}{#{compile_inline(caption)}}" #-
        puts "\\addcontentsline{toc}{#{HEADLINE[level]}}{\\numberline{#{toc_column()}}#{compile_inline(caption)}}" #+
      end
    end

    def toc_column
      #escape('コラム:')
      escape('[コラム]')
    end

    #### ブロック命令

    ## 導入文（//lead{ ... //}）のデザインをLaTeXのスタイルファイルで
    ## 変更できるよう、マクロを使う。
    def lead(lines)
      puts '\begin{starterlead}'   # オリジナルは \begin{quotation}
      puts lines
      puts '\end{starterlead}'
    end

    ## 章 (Chapter) の概要
    ## （導入文 //lead{ ... //} と似ているが、導入文では詩や物語を
    ##   引用するのが普通らしく、概要 (abstract) とは違うみたいなので、
    ##   概要を表すブロックを用意した。）
    def on_abstract_block()
      puts '\begin{starterabstract}'
      yield
      puts '\end{starterabstract}'
    end

    ## 章 (Chapter) の著者
    def on_chapterauthor_block(name)
      puts "\\starterchapterauthor{#{escape(name)}}"
    end

    ## 会話リスト
    def _render_talklist(opts, &b)
      puts '\begingroup'
      puts '  \makeatletter' unless opts.empty?
      opts.each do |k, v|
        puts "  \\def\\starter@talklist@#{k}{#{v}}"
      end
      puts '  \makeatother'  unless opts.empty?
      puts '\begin{startertalklist}'
      yield
      puts '\end{startertalklist}'
      puts '\endgroup'
    end

    ## 会話項目
    def _render_talk(image_filepath=nil, name=nil, &b)
      s = name ? compile_inline(name) : nil
      print "\\startertalk{#{image_filepath}}{#{s}}{%"
      yield
      @blank_needed = false
      puts "}"
    end

    ## キーと説明文のリスト
    def _render_desclist(opts, &b)
      bkup = @_desclist_opts
      @_desclist_opts = opts
      star = opts[:compact] ? '*' : ''
      puts "\\begingroup"
      puts "  \\makeatletter" unless opts.empty?
      opts.each do |k, v|
        k_ = k.to_s.gsub('_', '@')
        v_ = v == true ? 'Y' : v == false ? '' : escape(v.to_s)
        puts "  \\def\\starter@desclist@#{k_}{#{v_}}"
      end
      puts "  \\makeatother"  unless opts.empty?
      puts "\\begin{starterdesclist}"
      yield
      puts "\\end{starterdesclist}"
      puts "\\endgroup"
      @_desclist_opts = bkup
    end

    ## キーと説明文
    def on_desc_block(key, text=nil, &b)
      text = "\n" + text if text
      super(key, text, &b)
    end
    def _render_desc(key, &b)
      opts = @_desclist_opts
      s = compile_inline(key)
      #print "\\begin{starterdesc}{#{s}}"
      #print "\\begin{starterdesc}{#{s}}%"
      print "\\begin{starterdesc}{#{s}}\\ignorespaces "
      yield
      @blank_needed = false
      puts "\\end{starterdesc}"
    end

    ## 縦方向の空きを入れる
    def _render_vspace(size)
      puts "\\vspace{#{size}}"
    end

    def _render_addvspace(size)
      puts "\\addvspace{#{size}}"
    end

    ## 章タイトルを独立したページに
    def makechaptitlepage(option=nil)
      case option
      when nil, ""  ;
      when 'toc=section', 'toc=subsection' ;
      when 'toc', 'toc=on'
        option = "toc=on"
      else
        raise ArgumentError.new("//makechaptitlepage[#{option}]: unknown option (expected 'toc=section' or 'toc=subsection').")
      end
      puts "\\makechaptitlepage{#{option}}"
    end

    ## 縦方向のスペースがなければ改ページ
    def _render_needvspace(height)
      puts "\\needvspace{#{height}}"
    end

    ## 段(Paragraph)の終わりにスペースを入れる
    def paragraphend()
      puts "\\ParagraphEnd"
    end

    ## 小段(Subparagraph)の終わりにスペースを入れる（あれば）
    def subparagraphend()
      puts "\\SubparagraphEnd"
    end

    ## 引用（複数段落に対応）
    ## （入れ子対応なので、中に箇条書きや別のブロックを入れられる）
    def on_quote_block()
      puts '\begin{starterquote}'
      yield
      puts '\end{starterquote}'
    end
    def quote(lines)
      on_quote_block() do
        puts lines
      end
    end

    ## 引用 (====[quote] ... ====[/quote])
    ## （ブロック構文ではないので、中に箇条書きや別のブロックを入れられる）
    def quote_begin(level, label, caption)
      puts '\begin{starterquote}'
    end
    def quote_end(level)
      puts '\end{starterquote}'
    end

    ## ノート（//note[caption]{ ... //}）
    ## （入れ子対応なので、中に箇条書きや別のブロックを入れられる）
    def on_note_block(label=nil, caption=nil)
      with_context(:minicolumn) do
        caption, label = label, nil if caption.nil?
        s = compile_inline(caption || "")
        puts "\\begin{starternote}[#{label}]{#{s}}"
        yield
        puts "\\end{starternote}"
      end
    end
    def note(lines, label=nil, caption=nil)
      on_note_block(label, caption) do
        puts lines
      end
    end

    ## ノート (====[note] ... ====[/note])
    ## （ブロック構文ではないので、中に箇条書きや別のブロックを入れられる）
    def note_begin(level, label, caption)
      enter_context(:note)
      s = compile_inline(caption || "")
      puts "\\begin{starternote}[#{label}]{#{s}}"
    end
    def note_end(level)
      puts "\\end{starternote}"
      exit_context(:note)
    end

    ## コードリスト（//list, //emlist, //listnum, //emlistnum, //cmd, //source）
    ## TODO: code highlight support
    def list(lines, id=nil, caption=nil, lang=nil)
      program(lines, id, caption, _codeblock_optstr(lang, false))
    end
    def listnum(lines, id=nil, caption=nil, lang=nil)
      program(lines, id, caption, _codeblock_optstr(lang, true))
    end
    def emlist(lines, caption=nil, lang=nil)
      program(lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def emlistnum(lines, caption=nil, lang=nil)
      program(lines, nil, caption, _codeblock_optstr(lang, true))
    end
    def source(lines, caption=nil, lang=nil)
      program(lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def cmd(lines, caption=nil, lang=nil)
      terminal(lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def _codeblock_optstr(lang, lineno_flag)
      arr = []
      arr << lang if lang
      if lineno_flag
        first_line_num = line_num()
        arr << "lineno=#{first_line_num}"
        arr << "linenowidth=0"
      end
      return arr.join(",")
    end
    private :_codeblock_optstr

    ## 画像横に文章
    def _render_sideimage(filepath, imagewidth, opts, &b)
      side = opts['side'] || 'L'
      normalize = proc {|s|
        rexp = /\A(\d+(?:\.\d+)?)(%|mm|cm)\z/
        if    s !~ rexp ; s
        elsif $2 == '%' ; "#{$1.to_f/100.0}\\textwidth"
        else            ; "#{$1}true#{$2}"
        end
      }
      imgwidth = normalize.call(imagewidth)
      boxwidth = normalize.call(opts['boxwidth']) || imgwidth
      sepwidth = normalize.call(opts['sep'] || "0pt")
      puts "{\n"
      puts "  \\def\\starterminiimageframe{Y}\n" if opts['border']
      puts "  \\begin{startersideimage}{#{side}}{#{filepath}}{#{imgwidth}}{#{boxwidth}}{#{sepwidth}}{}\n"
      yield
      puts "  \\end{startersideimage}\n"
      puts "}\n"
    end

    ## 入れ子可能なブロック命令

    def on_minicolumn(type, caption=nil, &b)
      with_context(:minicolumn) do
        s = caption ? with_context(:caption) { compile_inline(caption) } : nil
        puts "\\begin{starter#{type}}{#{s}}"
        yield
        puts "\\end{starter#{type}}\n"
      end
    end
    protected :on_minicolumn

    ## 数式

    def texequation(lines, label=nil, caption=nil)
      blank()
      #
      if label.present?
        puts macro("begin", "reviewequationblock")
        chap = get_chap()
        if chap.nil?
          key  = "format_number_header_without_chapter"
          args = [@chapter.equation(label).number]
        else
          key  = "format_number_header"
          args = [chap, @chapter.equation(label).number]
        end
        s1 = I18n.t("equation")
        s2 = I18n.t(key, args)
        s3 = I18n.t("caption_prefix")
        s4 = compile_inline(caption)
        puts macro("reviewequationcaption", "#{s1}#{s2}#{s3}#{s4}")
        has_caption_line = true
      elsif caption.present?
        puts macro("begin", "reviewequationblock")
        s3 = I18n.t("caption_prefix")
        s4 = compile_inline(caption)
        puts macro("reviewequationcaption", "#{s3}#{s4}")
        has_caption_line = true
      else
        has_caption_line = false
      end
      #
      puts macro("begin", "equation*")
      lines.each do |line|
        puts unescape_latex(line)
      end
      puts macro("end", "equation*")
      #
      if has_caption_line
        puts macro("end", "reviewequationblock")
      end
      #
      blank()
    end

    #### インライン命令

    ## 改段落（箇条書き内では空行を入れられないため）
    def inline_par(arg)
      "\\starterpar{#{arg}}"
    end

    ## ファイル名
    def inline_file(str)
      on_inline_file { escape(str) }
    end
    def on_inline_file
      "\\starterfile{#{yield}}"
    end

    ## ユーザ入力
    def inline_userinput(str)
      on_inline_userinput { escape(str) }
    end
    def on_inline_userinput
      #if within_codeblock?()
      #  "{\\starteruserinput{\\seqsplit{#{yield}}}}"
      #else
        "\\starteruserinput{#{yield}}"
      #end
    end

    ## 引数をそのまま表示
    ## 例：
    ##   //emlist{
    ##     @<b>{ABC}             ← 太字の「ABC」が表示される
    ##     @<nop>$@<b>{ABC}$ ← 「@<b>{ABC}」がそのまま表示される
    ##   //}
    def inline_nop(str)
      escape(str || "")
    end
    alias inline_letitgo inline_nop

    ## 目立たせない（@<strong>{} の反対）
    def inline_weak(str)
      on_inline_weak { escape(str) }
    end
    def on_inline_weak
      #if within_codeblock?()
      #  "{\\starterweak{\\seqsplit{#{yield}}}}"
      #else
        "\\starterweak{#{yield}}"
      #end
    end

    ## 文字を小さくする
    def inline_small(str)   ; on_inline_small { escape(str) }  ; end
    def inline_xsmall(str)  ; on_inline_xsmall { escape(str) } ; end
    def inline_xxsmall(str) ; on_inline_xxsmall { escape(str) }; end
    def on_inline_small()   ; "{\\small{}#{yield}}"       ; end
    def on_inline_xsmall()  ; "{\\footnotesize{}#{yield}}"; end
    def on_inline_xxsmall() ; "{\\scriptsize{}#{yield}}"  ; end

    ## 文字を大きくする
    def inline_large(str)   ; on_inline_large { escape(str) }  ; end
    def inline_xlarge(str)  ; on_inline_xlarge { escape(str) } ; end
    def inline_xxlarge(str) ; on_inline_xxlarge { escape(str) }; end
    def on_inline_large()   ; "{\\large{}#{yield}}" ; end
    def on_inline_xlarge()  ; "{\\Large{}#{yield}}" ; end
    def on_inline_xxlarge() ; "{\\LARGE{}#{yield}}" ; end

    ## 文字を大きくした@<strong>{}
    def inline_xstrong(str) ; on_inline_xstring { escape(str) } ; end
    def inline_xxstrong(str); on_inline_xxstring { escape(str) }; end
    def on_inline_xstrong(&b) ; "{\\Large{}#{on_inline_strong(&b)}}" ; end
    def on_inline_xxstrong(&b); "{\\LARGE{}#{on_inline_strong(&b)}}" ; end

    ## コードブロック中で折り返し箇所を手動で指定する
    ## （\seqsplit による自動折り返し機能が日本語には効かないので、
    ##   長い行を日本語の箇所で折り返したいときは @<foldhere>{} を使う）
    def inline_foldhere(arg)
      return '\starterfoldhere{}'
    end

    ## ターミナルでのカーソル（背景が白、文字が黒）
    def inline_cursor(str)
      "{\\startercursor{#{escape(str)}}}"
    end

    ## 脚注（「//footnote」の脚注テキストを「@<fn>{}」でパースすることに注意）
    def inline_fn(id)
      if @book.config['footnotetext']
        macro("footnotemark[#{@chapter.footnote(id).number}]", '')
      elsif @doc_status[:caption] || @doc_status[:table] || @doc_status[:column]
        @foottext[id] = @chapter.footnote(id).number
        macro('protect\\footnotemark', '')
      else
        with_context(:footnote) { #+
          macro('footnote', compile_inline(@chapter.footnote(id).content.strip))
        }                         #+
      end
    rescue KeyError
      error "unknown footnote: #{id}"
    end

    ## nestable inline commands

    def on_inline_i()     ; "{\\reviewit{#{yield}}}"       ; end
    #def on_inline_b()     ; "{\\reviewbold{#{yield}}}"     ; end
    #def on_inline_tt()    ; "{\\reviewtt{#{yield}}}"       ; end
    def on_inline_tti()   ; "{\\reviewtti{#{yield}}}"      ; end
    def on_inline_ttb()   ; "{\\reviewttb{#{yield}}}"      ; end
    #def on_inline_code()  ; "{\\reviewcode{#{yield}}}"     ; end
    #def on_inline_del()   ; "{\\reviewstrike{#{yield}}}"   ; end
    def on_inline_ins()   ; "{\\reviewinsert{#{yield}}}"   ; end
    def on_inline_sub()   ; "{\\textsubscript{#{yield}}}"  ; end
    def on_inline_sup()   ; "{\\textsuperscript{#{yield}}}"; end
    def on_inline_em()    ; "{\\reviewem{#{yield}}}"       ; end
    def on_inline_strong(); "{\\reviewstrong{#{yield}}}"   ; end
    def on_inline_u()     ; "{\\reviewunderline{#{yield}}}"; end
    def on_inline_ami()   ; "{\\reviewami{#{yield}}}"      ; end
    def on_inline_balloon(); "{\\reviewballoon{#{yield}}}" ; end

    def on_inline_tt()
      return "{\\reviewtt{#{yield}}}"
    end

    def on_inline_code()
      with_context(:inline_code) {
        ## 連続した空白が1つの空白として扱われるのを防ぐ
        s = yield
        s = s.gsub(/ /, '{\\starterspacechar}')
        ## 連続した「`」や「'」はエスケープする必要がある
        #s = s.gsub(/\'\'/, "{'}{'}")
        #s = s.gsub(/\`\`/, '{`}{`}')
        ## 「`」と「'」に特別な効果を持たせない
        s = s.gsub(/\'/, '{\\textquotesingle}')
        s = s.gsub(/\`/, '{\\textasciigrave}')
        ## コンテキストによって、背景色をつけないことがある
        if false
        elsif within_context?(:headline)       # 章タイトルや節タイトルでは
          "{\\reviewcode[headline]{#{s}}}"     #   背景色をつけない（かも）
        elsif within_context?(:caption)        # リストや画像のキャプションでも
          "{\\reviewcode[caption]{#{s}}}"      #   背景色をつけない（かも）
        else                                   # それ以外では
          "{\\reviewcode{#{s}}}"               #   背景色をつける（かも）
        end
      }
    end

    ## @<b>{} が //terminal{ ... //} で効くように上書き
    def inline_b(str)
      on_inline_b { escape(str) }
    end
    def on_inline_b()  # nestable
      if within_codeblock?()
        #"{\\bfseries #{yield}}"            # \seqsplit{} 内では余計な空白が入る
        #"{\\bfseries{}#{yield}}"           # \seqsplit{} 内では後続も太字化する
        "\\bfseries{}#{yield}\\mdseries{}"  # \seqsplit{} 内でうまく効く
      else
        macro('reviewbold', yield)
      end
    end

    ## @<del>{} が //list や //terminal で効くように上書き
    def inline_del(str)
      on_inline_del { escape(str) }
    end
    def on_inline_del()
      if within_codeblock?()
        #"\\reviewstrike{#{yield}}"    # \seqsplit{} 内でエラーになる
        #"{\\reviewstrike{#{yield}}}"  # \seqsplit{} 内でもエラーにならないが折り返しされない
        #"{\\reviewstrike{\\seqsplit{#{yield}}}}"  # エラーにならないし、折り返しもされる
        "{\\reviewstrike{#{yield}}}"
      else
        macro('reviewstrike', yield)
      end
    end

    def build_inline_href(url, escaped_label)  # compile_href()をベースに改造
      flag_footnote = self.config_starter['linkurl_footnote']
      return _inline_hyperlink(url, escaped_label, flag_footnote)
    end

    ## @<href>{} の代わり
    def inline_hlink(str)
      url, label = str.split(/, /, 2)
      flag_footnote = self.config_starter['hyperlink_footnote']
      label_ = label.present? ? escape(label) : nil
      return _inline_hyperlink(url, label_, flag_footnote)
    end

    def _inline_hyperlink(url, escaped_label, flag_footnote)
      if /\A[a-z]+:/ !~ url
        "\\ref{#{url}}"
      elsif ! escaped_label.present?
        #"\\url{#{escape_url(url)}}"
        "\\starterurl{#{escape_url(url)}}{#{escape(url)}}"
      elsif ! flag_footnote
        "\\href{#{escape_url(url)}}{#{escaped_label}}"
      elsif within_context?(:footnote)
        #"#{escaped_label}(\\url{#{escape_url(url)}})"
        "#{escaped_label}(\\starterurl{#{escape_url(url)}}{#{escape(url)}})"
      else
        #"#{escaped_label}\\footnote{\\url{#{escape_url(url)}}}"
        #"#{escaped_label}\\footnote{\\starterurl{#{escape_url(url)}}{#{escape(url)}}}"
        url1 = escape_url(url)
        url2 = escape(url)
        "\\href{#{url1}}{#{escaped_label}}\\footnote{\\starterurl{#{url1}}{#{url2}}}"
      end
    end
    private :_inline_hyperlink

    def build_inline_ruby(escaped_word, escaped_yomi)  # compile_ruby()をベースに改造
      "\\ruby{#{escaped_word}}{#{escaped_yomi}}"
    end

    def inline_bou(str)
      ## original
      #str.split(//).map { |c| macro('ruby', escape(c), macro('textgt', BOUTEN)) }.join('\allowbreak')
      ## work well with XeLaTeX as well as upLaTeX
      str.split(//).map {|c| "\\ruby{#{escape(c)}}{#{BOUTEN}}" }.join('\allowbreak')
    end

    protected

    ## ノートを参照する
    def build_noteref(chapter, label, caption)
      "\\starternoteref{#{label}}{#{escape(caption)}}"
    end

    ## 数式を参照する
    def build_eq(chapter, label, number)
      #"\\reviewequationref{#{chapter.number}.#{number}}"
      escape("#{I18n.t('equation')}#{chapter.number}.#{number}")
    end

    public

    ## 数式を $...$ から \(...\) に変更する。
    ## これで //list の中でも @<m>$...$ が使えるようになる。
    ## ただし '^' や '_' がエスケープされるので、実用性はイマイチ。
    def inline_m(str)
      #" $#{str}$ "     # original
      "\\(#{str}\\)"
    end

    ## 「``」と「''」で囲む
    def on_inline_qq()
      "``#{yield}''"
    end

    ## 索引に載せる語句 (@<idx>{}, @<term>{})
    def inline_idx(str)
      s1, s2 = _compile_term(str)
      "#{s1}\\index{#{s2}}"
    end
    def inline_hidx(str)
      _, s2 = _compile_term(str)
      "\\index{#{s2}}"
    end
    def inline_term(str)
      s1, s2 = _compile_term(str)
      "\\starterterm{#{s1}}\\index{#{s2}}"
    end
    def on_inline_termnoidx()
      "\\starterterm{#{yield}}"
    end

    def _compile_term(str)
      arr = []
      placeholder = "\\starterindexplaceholder{}"
      display_str, see = parse_term(str, placeholder) do |term, term_e, yomi|
        if yomi
          arr << "#{escape_index(escape_latex(yomi))}@#{term_e}"
        elsif escape_index(term) != term_e
          arr << "#{escape_index(term)}@#{term_e}"
        else
          arr << term_e
        end
      end
      argstr = arr.join('!')
      argstr += "|see{#{escape_latex(see)}}" if see
      return display_str, argstr
    end
    private :_compile_term

  end


end
