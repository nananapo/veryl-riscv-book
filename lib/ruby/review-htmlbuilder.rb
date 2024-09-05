# -*- coding: utf-8 -*-

###
### ReVIEW::HTMLBuilderクラスを拡張する
###

require 'review/htmlbuilder'


module ReVIEW

  defined?(HTMLBuilder)  or raise "internal error: HTMLBuilder not found."


  class HTMLBuilder

    attr_accessor :starter_config

    def target_name
      "html"
    end

    def layoutfile
      ## 'rake web' のときに使うレイアウトファイルを 'layout.html5.erb' へ変更
      if @book.config.maker == 'webmaker'
        htmldir = 'web/html'
        #localfilename = 'layout-web.html.erb'
        localfilename = 'layout.html5.erb'
      else
        htmldir = 'html'
        localfilename = 'layout.html.erb'
      end
      ## 以下はリファクタリングした結果
      basename = @book.htmlversion == 5 ? 'layout-html5.html.erb' : 'layout-xhtml1.html.erb'
      htmlfilename = File.join(htmldir, basename)
      #
      layout_file = File.join(@book.basedir, 'layouts', localfilename)
      if ! File.exist?(layout_file)
        ! File.exist?(File.join(@book.basedir, 'layouts', 'layout.erb'))  or
          raise ReVIEW::ConfigError, 'layout.erb is obsoleted. Please use layout.html.erb.'
        layout_file = nil
      elsif ENV['REVIEW_SAFE_MODE'].to_i & 4 > 0
        warn "user's layout is prohibited in safe mode. ignored."
        layout_file = nil
      end
      layout_file ||= File.expand_path(htmlfilename, ReVIEW::Template::TEMPLATE_DIR)
      return layout_file
    end

    def result
      # default XHTML header/footer
      @title = strip_html(compile_inline(@chapter.title))
      @body = @output.string
      @language = @book.config['language']
      @stylesheets = @book.config['stylesheet']
      @next = @chapter.next_chapter
      @prev = @chapter.prev_chapter
      @next_title = @next ? compile_inline(@next.title) : ''
      @prev_title = @prev ? compile_inline(@prev.title) : ''

      if @book.config.maker == 'webmaker'
        #@toc = ReVIEW::WEBTOCPrinter.book_to_string(@book)          #-
        @toc = ReVIEW::WEBTOCPrinter.book_to_html(@book, @chapter)   #+
      end

      ReVIEW::Template.load(layoutfile()).result(binding())
    end

    def headline(level, label, caption)
      prefix, anchor = headline_prefix(level)
      prefix = "<span class=\"secno\">#{prefix}</span> " if prefix
      puts "" if level > 1
      a_id = ""
      a_id = "<a id=\"h#{anchor}\"></a>" if anchor
      #
      if caption.empty?
        puts a_id if label
      else
        br   = ""
        attr = label ? " id=\"#{normalize_id(label)}\"" : ""
        conf = @starter_config
        case level
        when 1 ; attr << " class=\"#{conf['chapter_decoration']} #{conf['chapter_align']} #{conf['chapter_oneline'] ? 'oneline' : 'twolines'}\"" if prefix
                 attr << " class=\"none #{conf['chapter_align']}\"" unless prefix
                 br = "<br/>" unless conf['chapter_oneline']
        when 2 ; attr << " class=\"#{conf['section_decoration']}\""
        when 3 ; attr << " class=\"#{conf['subsection_decoration']}\""
        end
        puts "<h#{level}#{attr}>#{a_id}#{prefix}#{br}#{compile_inline(caption)}</h#{level}>"
      end
    end

    def result_metric(array)
      attrs = {}
      array.each do |item|
        k = item.keys[0]
        v = item[k]
        if k == 'border' && v == 'on'
          k = 'class'; v = 'border-on'
        end
        (attrs[k] ||= []) << v
      end
      attrs.map {|k, arr| " #{k}=\"#{arr.join(' ')}\"" }.join()
    end

    ## 画像

    def _render_image(id, image_filepath, caption, opts)
      src = image_filepath.sub(/\A\.\//, '')
      alt = escape_html(compile_inline(caption))
      #
      classes = ["img"]
      styles = []
      #
      if opts[:scale]
        case (scale = opts[:scale])
        when /\A\d+\z/, /\A\d\.\d*\z/, /\A\.\d+\z/
          per = (scale.to_f * 100).round()
        when /\A\d+(\.\d+)?%\z/
          per = scale.sub(/%\z/, '').to_f.round()
        else
          error "scale=#{scale}: invalid scale value."
        end
        found = PERCENT_THRESHOLDS.find {|x| x == per }
        if found
          classes << 'width-%03dper' % per
        else
          styles << "max-width:#{per}%"
        end
      end
      #
      classes << opts[:class] if opts[:class]
      classes << "border"     if opts[:border]
      classes << "draft"      if opts[:draft]
      styles  << opts[:style] if opts[:style]
      styles  << "width:#{opts[:width]}" if opts[:width]
      #
      puts "<div id=\"#{normalize_id(id)}\" class=\"image\">"
      print "<img src=\"#{src}\" alt=\"#{alt}\""
      print " class=\"#{classes.join(' ')}\"" unless classes.empty?
      print " style=\"#{styles.join(' ')}\""  unless styles.empty?
      puts  " />"
      image_header(id, caption)
      puts "</div>"
    end

    PERCENT_THRESHOLDS = [
      10, 20, 25, 30, 33, 40, 50, 60, 67, 70, 75, 80, 90, 100,
    ]

    protected

    ## コードブロック（//program, //terminal, //output）

    CLASSNAMES = {
      "program"   => "code",
      "terminal"  => "cmd-code",
      "list"      => "caption-code",
      "listnum"   => "code",
      "emlist"    => "emlist-code",
      "emlistnum" => "emlistnum-code",
      "source"    => "source-code",
      "cmd"       => "cmd-code",
      "output"    => "output",
    }

    def _codeblock_eolmark()
      "<small class=\"startereolmark\"></small>"
    end

    def _codeblock_indentmark()
      '<span class="indentbar"> </span>'
    end

    def _render_codeblock(blockname, lines, id, caption_str, opts)
      caption = caption_str
      #
      if opts['eolmark']
        eolmark = _codeblock_eolmark()   # ex: '{\startereolmark}'
      else
        eolmark = nil
      end
      #
      eol = eolmark ? "#{eolmark}\n" : "\n"
      lines = lines.map {|line|
        line = _parse_inline(line) {|text| escape(text) }
      }
      #
      indent_width = opts['indent']
      if indent_width && indent_width > 0
        lines = _add_indent_mark(lines, indent_width)
      end
      #
      classname = CLASSNAMES[blockname] || "code"
      classname += " #{opts['classname']}" if opts['classname']
      puts "<div id=\"#{normalize_id(id)}\" class=\"#{classname}\">" if id.present?
      puts "<div class=\"#{classname}\">"                        unless id.present?
      #
      classattr = nil
      if id.present? || caption.present?
        str = _build_caption_str(id, caption)
        print "<span class=\"caption\">#{str}</span>\n"
        classattr = "list"
      end
      if blockname == "output"
        classattr = blockname
      else
        classattr ||= "emlist"
      end
      #
      lang = opts['lang']
      lang = File.extname(id || "").gsub(".", "") if lang.blank?
      classattr << " language-#{lang}" unless lang.blank?
      classattr << " highlight"        if highlight?
      print "<pre class=\"#{classattr}\">"
      #
      gen = opts['lineno'] ? LineNumberGenerator.new(opts['lineno']).each : nil
      if gen
        width = opts['linenowidth'] || -1
        if width < 0
          format = "%s"
        elsif width == 0
          last_lineno = gen.each.take(lines.length).compact.last
          width = last_lineno.to_s.length
          format = "%#{width}s"
        else
          format = "%#{width}s"
        end
      end
      buf = []
      start_tag = (opts['linenowidth'] || -1) >= 0 ? "<em class=\"linenowidth\">" : "<em class=\"lineno\">"
      lines.each_with_index do |line, i|
        buf << start_tag << (format % gen.next) << ": </em>" if gen
        buf << line #<< "\n"
      end
      puts highlight(body: buf.join(), lexer: lang,
                     format: "html", linenum: !!gen,
                     #options: {linenostart: start}
                     )
      #
      print "</pre>\n"
      print "</div>\n"
    end

    def _add_indent_mark(lines, indent_width)
      space = " "
      rexp  = /\A( +)/
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

    ## コードリスト（//list, //emlist, //listnum, //emlistnum, //cmd, //source）
    def list(lines, id=nil, caption=nil, lang=nil)
      _codeblock("list", lines, id, caption, _codeblock_optstr(lang, false))
    end
    def listnum(lines, id=nil, caption=nil, lang=nil)
      _codeblock("listnum", lines, id, caption, _codeblock_optstr(lang, true))
    end
    def emlist(lines, caption=nil, lang=nil)
      _codeblock("emlist", lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def emlistnum(lines, caption=nil, lang=nil)
      _codeblock("emlistnum", lines, nil, caption, _codeblock_optstr(lang, true))
    end
    def source(lines, caption=nil, lang=nil)
      _codeblock("source", lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def cmd(lines, caption=nil, lang=nil)
      lang ||= "shell-session"
      _codeblock("cmd", lines, nil, caption, _codeblock_optstr(lang, false))
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

    protected

    ## @<secref>{}

    def _build_secref(chap, num, title, parent_title)
      s = ""
      ## 親セクションのタイトルがあれば使う
      if parent_title
        s << "「%s」内の" % parent_title   # TODO: I18n化
      end
      ## 対象セクションへのリンクを作成する
      if @book.config['chapterlink']
        filename = "#{chap.id}#{extname()}"
        dom_id = 'h' + num.gsub('.', '-')
        s << "「<a href=\"#{filename}##{dom_id}\">#{title}</a>」"
      else
        s << "「#{title}」"
      end
      return s
    end

    public

    ## 順序つきリスト

    def ol_begin(start_num=nil)
      @_ol_types ||= []    # stack
      case start_num
      when nil
        type = "1"; start = 1
      when /\A(\d+)\.\z/
        type = "1"; start = $1.to_i
      when /\A([A-Z])\.\z/
        type = "A"; start = $1.ord - 'A'.ord + 1
      when /\A([a-z])\.\z/
        type = "a"; start = $1.ord - 'a'.ord + 1
      else
        type = nil; start = nil
      end
      if type
        puts "<ol start=\"#{start}\" type=\"#{type}\">"
      else
        puts "<ol class=\"ol-none\">"
      end
      @_ol_types.push(type)
    end

    def ol_end()
      ol = !! @_ol_types.pop()
      if ol
        puts "</ol>"
      else
        puts "</ol>"
      end
    end

    def ol_item_begin(lines, num)
      ol = !! @_ol_types[-1]
      if ol
        print "<li>#{lines.join}"
      else
        n = escape_html(num)
        print "<li data-mark=\"#{n}\"><span class=\"li-mark\">#{n} </span>#{lines.join}"
      end
    end

    def ol_item_end()
      puts "</li>"
    end

    def dl_dd_begin()
      puts "<dd>"
    end

    def dl_dd_end()
      puts "</dd>"
    end

    ## 画像横に文章
    def _render_sideimage(filepath, imagewidth, opts, &b)
      side     = (opts['side'] || 'L') == 'L' ? 'left' : 'right'
      imgclass = opts['border'] ? "image-bordered" : nil
      normalize = proc {|s| s =~ /^\A(\d+(\.\d+))%\z/ ? "#{$1.to_f/100.0}\\textwidth" : s }
      imgwidth = normalize.call(imagewidth)
      boxwidth = normalize.call(opts['boxwidth']) || imgwidth
      sepwidth = normalize.call(opts['sep'] || "0pt")
      #
      puts "<div class=\"sideimage\">\n"
      puts "  <div class=\"sideimage-image\" style=\"float:#{side};text-align:center;width:#{boxwidth}\">\n"
      puts "    <img src=\"#{filepath}\" class=\"#{imgclass}\" style=\"width:#{imgwidth}\"/>\n"
      puts "  </div>\n"
      puts "  <div class=\"sideimage-text\" style=\"margin-#{side}:#{boxwidth}\">\n"
      puts "    <div style=\"padding-#{side}:#{sepwidth}\">\n"
      yield
      puts "    </div>\n"
      puts "  </div>\n"
      puts "</div>\n"
    end

    ## 入れ子可能なブロック命令

    def on_minicolumn(type, caption=nil, &b)
      with_context(:minicolumn) do
        puts "<div class=\"miniblock miniblock-#{type}\">"
        puts "<p class=\"miniblock-caption\">#{compile_inline(caption)}</p>" if caption.present?
        yield
        puts '</div>'
      end
    end
    protected :on_minicolumn

    #### ブロック命令

    def footnote(id, str)
      id_val = "fn-#{normalize_id(id)}"
      href   = "#fnb-#{normalize_id(id)}"
      text   = compile_inline(str)
      chap_num = @chapter.footnote(id).number
      if @book.config['epubversion'].to_i == 3
        attr = " epub:type=\"footnote\""
        mark = "[*#{chap_num}]"
      else
        attr = ""
        mark = "[<a href=\"#{href}\">*#{chap_num}</a>]"
      end
      #
      if truncate_if_endwith?("</div><!--/.footnote-list-->\n")
      else
        puts "<div class=\"footnote-list\">"
      end
      print "<div class=\"footnote\" id=\"#{id_val}\"#{attr}>"
      print "<p class=\"footnote\">"
      print "<span class=\"footnote-mark\">#{mark} </span>"
      print text
      print "</p>"
      puts  "</div>"
      puts  "</div><!--/.footnote-list-->\n"
    end

    alias __original_texequation texequation
    def texequation(lines, label=nil, caption=nil)
      if label.present?
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
        puts "<span class=\"caption\">#{s1}#{s2}#{s3}#{s4}</span>"
        has_caption_line = true
      elsif caption.present?
        s3 = I18n.t("caption_prefix")
        s4 = compile_inline(caption)
        puts "<span class=\"caption\">#{s3}#{s4}</span>"
        has_caption_line = true
      else
        has_caption_line = false
      end
      #
      __original_texequation(lines)
    end

    ## 章 (Chapter) の概要
    def on_abstract_block()
      puts '<div class="abstract">'
      yield
      puts '</div>'
    end

    ## 章 (Chapter) の著者
    def on_chapterauthor_block(name)
      puts "<div class=\"chapterauthor\">#{escape(name)}</div>"
    end

    ## 会話リスト
    def _render_talklist(opts, &b)
      c = opts[:classname]
      s = c ? " #{c}" : nil
      puts "<div class=\"talk-outer#{s}\">"
      puts "  <ul class=\"talk-list#{s}\">"
      yield
      puts "  </ul>"
      puts "</div>"
    end

    ## 会話項目
    def _render_talk(image_filepath=nil, name=nil, &b)
      puts "<li class=\"talk-item\">"
      print "  <span class=\"talk-chara\">"
      if image_filepath.present?
        print "<img class=\"talk-image\" src=\"#{image_filepath}\"/>"
      else
        s = compile_inline(name || '')
        print "<b class=\"talk-name\">#{s}</b>"
      end
      puts "</span>"
      print "  <div class=\"talk-text\">"
      yield
      if @output.string.end_with?("\n")
        @output.seek(-1, IO::SEEK_CUR)   # 改行文字を取り除く
        #@output.string.chomp!           # これだとヌル文字が入ってしまう
      end
      puts "</div>"
      puts "</li>"
    end

    ## キーと説明文のリスト
    def _render_desclist(opts, &b)
      bkup = @_desclist_opts
      @_desclist_opts = opts
      classnames = ['desc-list']
      classnames << 'compact'        if opts[:compact]
      classnames << 'item-bold'      if opts[:bold]
      classnames << opts[:classname] if opts[:classname]
      puts "<dl class=\"#{classnames.join(' ')}\">"
      yield
      puts "</dl>"
      @_desclist_opts = bkup
    end

    ## キーと説明文
    def _render_desc(key, &b)
      opts = @_desclist_opts
      s = compile_inline(key)
      s = "<b>#{s}</b>" if opts[:bold]
      puts "  <dt class=\"desc\">#{s}</dt>"
      puts "  <dd class=\"desc\">"
      yield
      puts "  </dd>"
    end

    ## 縦方向の空きを入れる
    def _render_vspace(size)
      puts "<div class=\"vspace\" style=\"height:#{size}\"></div>"
    end

    def _render_addvspace(size)
      puts "<div class=\"addvspace\" style=\"height:#{size}\"></div>"
    end

    ## 章タイトルを独立したページに
    def makechaptitlepage(option=nil)
      puts ''   # HTMLでは特に何もしない
    end

    ## 縦方向のスペースがなければ改ページ
    def _render_needvspace(height)
      puts "<div style=\"height:#{height}\"></div>"
    end

    ## 段(Paragraph)の終わりにスペースを入れる
    def paragraphend()
      puts ''   # HTMLでは特に何もしない
    end

    ## 小段(Subparagraph)の終わりにスペースを入れる（あれば）
    def subparagraphend()
      puts ''   # HTMLでは特に何もしない
    end

    ## 引用（複数段落に対応）
    def blockquote(lines)
      puts '<blockquote class="blockquote">'
      puts lines
      puts '</blockquote>'
    end

    ## 引用（//quote{ ... //}）
    ## （入れ子対応なので、中に箇条書きや別のブロックを入れられる）
    def on_quote_block()
      puts '<blockquote class="blockquote">'
      yield
      puts '</blockquote>'
    end
    def quote(lines)
      on_quote_block() do
        puts lines
      end
    end

    ## 引用 (====[quote] ... ====[/quote])
    ## （ブロック構文ではないので、中に別のブロックや箇条書きを入れられる）
    def quote_begin(level, label, caption)
      puts '<blockquote class="blockquote">'
    end
    def quote_end(level)
      puts '</blockquote>'
    end

    ## ノート（//note{ ... //}）
    ## （入れ子対応なので、中に箇条書きや別のブロックを入れられる）
    def on_note_block(label=nil, caption=nil)
      with_context(:minicolumn) do
        caption, label = label, nil if caption.nil?
        if label
          puts "<div class=\"note\" id=\"#{label}\">"
        else
          puts "<div class=\"note\">"
        end
        puts "<h5>#{compile_inline(caption)}</h5>" if caption.present?
        yield
        puts "</div>"
      end
    end
    def note(lines, label=nil, caption=nil)
      on_quote_block(label, caption) do
        puts lines
      end
    end

    ## ノート (====[note] ... ====[/note])
    ## （ブロック構文ではないので、中に別のブロックや箇条書きを入れられる）
    def note_begin(level, label, caption)
      s = compile_inline(caption || "")
      puts "<div class=\"note\">"
      puts "<h5>#{s}</h5>" if s.present?
    end
    def note_end(level)
      puts "</div>"
    end

    ## テーブル
    def table(lines, id=nil, caption=nil, option=nil)
      super
    end

    def table_header(id, caption, options)
      if id.present?
        begin
          num = @chapter.table(id).number
        rescue KeyError
          error "no such table: #{id}"
        end
        s1 = I18n.t('table')
        s2 = get_chap() \
           ? I18n.t('format_number_header', [get_chap(), num]) \
           : I18n.t('format_number_header_without_chapter', [num])
        s3 = I18n.t('caption_prefix')
        puts "<p class=\"caption\">#{s1}#{s2}#{s3}#{compile_inline(caption||'')}</p>"
      elsif caption.present?
        puts "<p class=\"caption\">#{compile_inline(caption||'')}</p>"
      end
    end

    def table_begin(_ncols, fontsize: nil)
      if fontsize
        puts "<table style=\"font-size:#{fontsize}\">"
      else
        puts "<table>"
      end
    end

    protected

    def _table_before(id, caption, opts)
      class_ = opts[:csv] ? "table table-nohline" : "table"
      if id.present?
        puts "<div id=\"#{normalize_id(id)}\" class=\"#{class_}\">"
      else
        puts "<div class=\"#{class_}\">"
      end
    end

    def _table_after(id, caption, opts)
      puts "</div>"
    end

    def _table_bottom(hline: false)
    end

    def _table_tr(cells, hline: false)
      if hline
        "<tr class=\"hline\">#{cells.join}</tr>"
      else
        "<tr>#{cells.join}</tr>"
      end
    end

    public

    ## //imgtable
    def imgtable(lines, id, caption=nil, option=nil)
      super
    end

    protected

    def _render_imgtable(id, caption, opts)
      puts "<div id=\"#{normalize_id(id)}\" class=\"imgtable image\">"
      table_header(id, caption, opts)
      puts "  <div>"
      yield
      puts "  </div>"
      puts "</div>"
    end

    def _render_imgtable_caption(caption)
    end

    def _render_imgtable_label(id)
    end

    public

    #### インライン命令

    def inline_fn(id)
      if @book.config['epubversion'].to_i == 3
        type = " epub:type=\"noteref\""
      else
        type = ""
      end
      return "<sup><a id=\"fnb-#{normalize_id(id)}\" href=\"#fn-#{normalize_id(id)}\" class=\"noteref\"#{type}>*#{@chapter.footnote(id).number}</a></sup>"
    rescue KeyError
      error "unknown footnote: #{id}"
    end

    ## 改段落（箇条書き内では空行を入れられないため）
    def inline_par(arg)
      case arg
      when 'i'
        "<p class=\"indent\">"
      else
        "<p>"
      end
    end

    ## ファイル名
    def inline_file(str)
      on_inline_file { escape(str) }
    end
    def on_inline_file
      "<span class=\"file\">#{yield}</span>"
    end

    ## ユーザ入力
    def inline_userinput(str)
      on_inline_input { escape(str) }
    end
    def on_inline_userinput
      "<span class=\"userinput\">#{yield}</span>"
    end

    ## 引数をそのまま表示 (No Operation)
    def inline_nop(str)
      escape_html(str || "")
    end
    alias inline_letitgo inline_nop

    ## 目立たせない（@<strong>{} の反対）
    def inline_weak(str)
      on_inline_weak { escape(str) }
    end
    def on_inline_weak
      "<span class=\"weak\">#{yield}</span>"
    end

    ## 文字を小さくする
    def inline_small(str)   ; on_inline_small { escape(str) } ; end
    def inline_xsmall(str)  ; on_inline_xsmall { escape(str) } ; end
    def inline_xxsmall(str) ; on_inline_xxsmall { escape(str) } ; end

    def on_inline_small   ; "<small style=\"font-size:small\">#{yield}</small>"   ; end
    def on_inline_xsmall  ; "<small style=\"font-size:x-small\">#{yield}</small>" ; end
    def on_inline_xxsmall ; "<small style=\"font-size:xx-small\">#{yield}</small>"; end

    ## 文字を大きくする
    def inline_large(str)   ; on_inline_large { escape(str) } ; end
    def inline_xlarge(str)  ; on_inline_xlarge { escape(str) } ; end
    def inline_xxlarge(str) ; on_inline_xxlarge { escape(str) } ; end
    def on_inline_large   ; "<span style=\"font-size:large\">#{yield}</span>"   ; end
    def on_inline_xlarge  ; "<span style=\"font-size:x-large\">#{yield}</span>" ; end
    def on_inline_xxlarge ; "<span style=\"font-size:xx-large\">#{yield}</span>"; end

    ## 文字を大きくした@<strong>{}
    def inline_xstrong(str) ; on_inline_xstrong { escape(str) }; end
    def inline_xxstrong(str); on_inline_xxstrong { escape(str) }; end
    def on_inline_xstrong ; "<span style=\"font-size:x-large\">#{yield}</span>"; end
    def on_inline_xxstrong; "<span style=\"font-size:xx-large\">#{yield}</span>"; end

    ## コードブロック中で折り返し箇所を手動で指定する
    def inline_foldhere(arg)
      '<br>'
    end

    ## ターミナルでのカーソル（背景が白、文字が黒）
    def inline_cursor(str)
      "<span class=\"cursor\">#{escape_html(str)}</span>"
    end

    ## nestable inline commands

    def on_inline_i()     ; "<i>#{yield}</i>"           ; end
    def on_inline_b()     ; "<b>#{yield}</b>"           ; end
    #def on_inline_code()  ; "<code>#{yield}</code>"     ; end
    def on_inline_tt()    ; "<tt>#{yield}</tt>"         ; end
    def on_inline_del()   ; "<del>#{yield}</del>"       ; end  # or '<s></s>'
    def on_inline_ins()   ; "<ins>#{yield}</ins>"       ; end
    def on_inline_sub()   ; "<sub>#{yield}</sub>"       ; end
    def on_inline_sup()   ; "<sup>#{yield}</sup>"       ; end
    def on_inline_em()    ; "<em>#{yield}</em>"         ; end
    def on_inline_strong(); "<strong>#{yield}</strong>" ; end
    def on_inline_u()     ; "<u>#{yield}</u>"           ; end
    def on_inline_ami()   ; "<span class=\"ami\">#{yield}</span>"; end
    def on_inline_balloon(); "<span class=\"balloon\">← #{yield}</span>"; end

    def on_inline_code()
      return "<code class=\"inline-code\">#{yield}</code>"
    end

    ## 「“」と「”」で囲む
    def on_inline_qq()
      "“#{yield}”"
    end

    def build_inline_href(url, escaped_label)  # compile_href()をベースに改造
      flag_link = @book.config['externallink']
      return _inline_hyperlink(url, escaped_label, flag_link)
    end

    def inline_hlink(str)
      url, label = str.split(/, /, 2)
      flag_link = @book.config['externallink']
      label_ = label.present? ? escape(label) : nil
      return _inline_hyperlink(url, label_, flag_link)
    end

    def _inline_hyperlink(url, escaped_label, flag_link)
      if flag_link
        label = escaped_label || escape_html(url)
        "<a href=\"#{escape_html(url)}\" class=\"link\">#{label}</a>"
      elsif escaped_label
        I18n.t('external_link', [escaped_label, escape_html(url)])
      else
        escape_html(url)
      end
    end
    private :_inline_hyperlink

    def build_inline_ruby(escaped_word, escaped_yomi)  # compile_ruby()をベースに改造
      pre = I18n.t('ruby_prefix'); post = I18n.t('ruby_postfix')
      if @book.htmlversion == 5
        "<ruby>#{escaped_word}<rp>#{pre}</rp><rt>#{escaped_yomi}</rt><rp>#{post}</rp></ruby>"
      else
        "<ruby><rb>#{escaped_word}</rb><rp>#{pre}</rp><rt>#{escaped_yomi}</rt><rp>#{post}</rp></ruby>"
      end
    end

    protected

    ## ノートを参照する
    def build_noteref(chapter, label, caption)
      href = chapter ? "#{chapter.id}#{extname()}##{label}" : "##{label}"
      %Q`ノート「<a href="#{href}">#{escape(caption)}</a>」`
    end

    ## 数式を参照する
    def build_eq(chapter, label, number)
      s = "#{I18n.t('equation')}#{chapter.number}.#{number}"
      "<a>#{escape(s)}</a>"
    end

    ## 索引に載せる語句 (@<idx>{}, @<term>{})
    public
    def inline_idx(str)
      s1, s2 = _compile_term(str)
      %Q`<span class="index" title="#{s2}">#{s1}</span>`
    end
    def inline_hidx(str)
      _, s2 = _compile_term(str)
      %Q`<span class="index" title="#{s2}"></span>`
    end
    def inline_term(str)
      s1, s2 = _compile_term(str)
      %Q`<span class="index term" title="#{s2}">#{s1}</span>`
    end
    def on_inline_termnoidx(str)
      %Q`<span class="term">#{yield}</span>`
    end

    def _compile_term(str)
      arr = []
      placeholder = "---"
      display_str, see = parse_term(str, placeholder) do |term, term_e, yomi|
        if yomi
          arr << escape(yomi)
        else
          arr << term_e
        end
      end
      title_attr = arr.join()
      title_attr += " → see: #{escape(see)}" if see
      return display_str, title_attr
    end
    private :_compile_term

  end


  class TEXTBuilder

    def target_name
      "text"
    end

    ## nestable inline commands

    def on_inline_i()     ; "<i>#{yield}</i>"           ; end
    def on_inline_b()     ; "<b>#{yield}</b>"           ; end
    def on_inline_code()  ; "<code>#{yield}</code>"     ; end
    def on_inline_tt()    ; "<tt>#{yield}</tt>"         ; end
    def on_inline_del()   ; "<s>#{yield}</s>"           ; end
    def on_inline_sub()   ; "<sub>#{yield}</sub>"       ; end
    def on_inline_sup()   ; "<sup>#{yield}</sup>"       ; end
    def on_inline_em()    ; "<em>#{yield}</em>"         ; end
    def on_inline_strong(); "<strong>#{yield}</strong>" ; end
    def on_inline_u()     ; "<u>#{yield}</u>"           ; end
    def on_inline_ami()   ; "<span class=\"ami\">#{yield}</span>"; end

    def build_inline_href(url, escaped_label)  # compile_href()をベースに改造
      if @book.config['externallink']
        label = escaped_label || escape_html(url)
        "<a href=\"#{escape_html(url)}\" class=\"link\">#{label}</a>"
      elsif escaped_label
        I18n.t('external_link', [escaped_label, escape_html(url)])
      else
        escape_html(url)
      end
    end

    def build_inline_ruby(escaped_word, escaped_yomi)  # compile_ruby()をベースに改造
      pre = I18n.t('ruby_prefix'); post = I18n.t('ruby_postfix')
      if @book.htmlversion == 5
        "<ruby>#{escaped_word}<rp>#{pre}</rp><rt>#{escaped_yomi}</rt><rp>#{post}</rp></ruby>"
      else
        "<ruby><rb>#{escaped_word}</rb><rp>#{pre}</rp><rt>#{escaped_yomi}</rt><rp>#{post}</rp></ruby>"
      end
    end

    ## その他

    def inline_nop(str)
      str || ''
    end
    alias inline_letitgo inline_nop

  end


end
