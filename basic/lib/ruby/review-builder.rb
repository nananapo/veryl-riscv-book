# -*- coding: utf-8 -*-

###
### ReVIEW::Builderクラスを拡張する
###

require 'csv'

require 'review/builder'


module ReVIEW

  defined?(Builder)  or raise "internal error: Builder not found."


  class Builder

    def target_name
      c = self.class.to_s.gsub('ReVIEW::', '').gsub('Builder', '').downcase
      return c
    end

    def config_starter
      return @book.config['starter']
    end

    def _current_target?(name_str)
      s = name_str.to_s.strip
      return true if s.empty? || s == '*'
      t = target_name()
      return s.split(',').map(&:strip).include?(t)
    end

    ## Re:VIEW3で追加されたもの
    def on_inline_balloon(arg)
      return "← #{yield}"
    end

    ## ul_item_begin() だけあって ol_item_begin() がないのはどうかと思う。
    ## ol の入れ子がないからといって、こういう非対称な設計はやめてほしい。
    def ol_item_begin(lines, _num)
      ol_item(lines, _num)
    end
    def ol_item_end()
    end

    def dl_dd_begin()
    end

    def dl_dd_end()
    end

    protected

    def truncate_if_endwith?(str)
      sio = @output   # StringIO object
      if sio.string.end_with?(str)
        pos = sio.pos - str.length
        sio.seek(pos)
        sio.truncate(pos)
        true
      else
        false
      end
    end

    def truncate_blank()
      sio = @output   # StringIO object
      if sio.string.end_with?("\n\n")
        pos = sio.pos - 1
        sio.seek(pos)
        sio.truncate(pos)
        true
      else
        false
      end
    end

    def enter_context(key)
      @doc_status[key] = true
    end

    def exit_context(key)
      @doc_status[key] = nil
    end

    def with_context(key)
      enter_context(key)
      return yield
    ensure
      exit_context(key)
    end

    def within_context?(key)
      return @doc_status[key]
    end

    def within_codeblock?
      d = @doc_status
      d[:program] || d[:terminal] || d[:output]\
      || d[:list] || d[:emlist] || d[:listnum] || d[:emlistnum] \
      || d[:cmd] || d[:source]
    end

    ## 入れ子可能なブロック命令

    public

    def on_note_block      caption=nil, &b; on_minicolumn :note     , caption, &b; end
    def on_memo_block      caption=nil, &b; on_minicolumn :memo     , caption, &b; end
    def on_tip_block       caption=nil, &b; on_minicolumn :tip      , caption, &b; end
    def on_info_block      caption=nil, &b; on_minicolumn :info     , caption, &b; end
    def on_warning_block   caption=nil, &b; on_minicolumn :warning  , caption, &b; end
    def on_important_block caption=nil, &b; on_minicolumn :important, caption, &b; end
    def on_caution_block   caption=nil, &b; on_minicolumn :caution  , caption, &b; end
    def on_notice_block    caption=nil, &b; on_minicolumn :notice   , caption, &b; end

    def on_minicolumn(type, caption=nil, &b)
      raise NotImplementedError.new("#{self.class.name}#on_minicolumn(): not implemented yet.")
    end
    protected :on_minicolumn

    ## 画像横に文章

    def on_sideimage_block(imagefile, imagewidth, option_str=nil, &b)
      opts = _sideimage_parse_options(option_str) { "//sideimage[#{imagefile}][#{imagewidth}]" }
      _sideimage_validate_args(imagefile, imagewidth)
      filepath = find_image_filepath(imagefile)
      _render_sideimage(filepath, imagewidth, opts, &b)
    end

    def _render_sideimage(filepath, imagewidth, opts, &b)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end

    def _sideimage_parse_options(option_str, &b)
      opts = {}
      _each_block_option(option_str) do |k, v|
        case k
        when 'side'
          v == 'L' || v == 'R'  or
            error "#{yield}[#{k}=#{v}]: 'side=' should be 'L' or 'R'."
        when 'boxwidth'
          v =~ /\A\d+(\.\d+)?(%|mm|cm|zw)\z/  or
            error "#{yield}[#{k}=#{v}]: 'boxwidth=' invalid (expected such as 10%, 30mm, 3.0cm, or 5zw)"
        when 'sep'
          v =~ /\A\d+(\.\d+)?(%|mm|cm|zw)\z/  or
            error "#{yield}[#{k}=#{v}]: 'sep=' invalid (expected such as 2%, 5mm, 0.5cm, or 1zw)"
        when 'border'
          v.nil? || v =~ /\A(on|off)\z/  or
            error "#{yield}[#{k}=#{v}]: 'border=' should be 'on' or 'off'"
          v = v.nil? ? true : v == 'on'
        else
          error "#{yield}[#{k}=#{v}]: unknown option '#{k}=#{v}'."
        end
        opts[k] = v
      end
      return opts
    end

    def _sideimage_validate_args(imagefile, imagewidth)
      imagefile.present?  or
        error "//sideimage: 1st option (image file) required."
      imagewidth.present?  or
        error "//sideimage: 2nd option (image width) required."
      imagewidth =~ /\A\d+(\.\d+)?(%|mm|cm|zw|pt)\z/  or
        error "//sideimage: [#{imagewidth}]: invalid image width (expected such as: 30mm, 3.0cm, 5zw, or 100pt)"
    end

    ## コードブロック（//program, //terminal, //output）

    ## プログラム用ブロック命令
    def program(lines, id=nil, caption=nil, optionstr=nil)
      _codeblock('program', lines, id, caption, optionstr)
    end

    ## ターミナル用ブロック命令
    def terminal(lines, id=nil, caption=nil, optionstr=nil)
      _codeblock('terminal', lines, id, caption, optionstr)
    end

    ## 出力結果用ブロック命令
    def output(lines, id=nil, caption=nil, optionstr=nil)
      _codeblock('output', lines, id, caption, optionstr)
    end

    protected

    def _codeblock(blockname, lines, id, caption, optionstr)
      opts = _codeblock_parse_options(optionstr) {
        "//#{blockname}[#{id}][#{caption}]"
      }
      default_opts = _codeblock_default_options(blockname)
      default_opts.each {|k, v| opts[k] = v unless opts.key?(k) }
      #
      if opts['file']
        lines = _codeblock_read_file(opts['file'], opts['encoding'])
      end
      #
      lines = lines.map {|line| detab(line) }
      #
      if id.present? || caption.present?
        caption_str = _build_caption_str(id, caption)
      else
        caption_str = nil
      end
      #
      _render_codeblock(blockname, lines, id, caption_str, opts)
    end

    def _codeblock_default_options(blockname)
      terminal_p = (blockname == 'terminal' || blockname == 'cmd')
      dict = self.config_starter()
      return dict['terminal_default_options'] if terminal_p
      return dict['program_default_options']
    end

    def _each_block_option(option_str)
      return if option_str.nil?
      option_str = option_str.strip()
      return if option_str.empty?
      b = nil
      option_str.split(',').each do |kvs|
        k, v = kvs.strip.split('=', 2)
        if k =~ /::?/
          t = $`; k = $'
          b ||= target_name()
          next unless t == b
        end
        yield k, v
      end
    end

    def _codeblock_parse_options(option_str, &b)  # parse 'fold={on|off},...'
      opts = {}
      return opts if option_str.nil? || option_str.empty?
      vals = {nil=>true, 'on'=>true, 'off'=>false}
      i = -1
      _each_block_option(option_str) do |k, v|
        i += 1
        ## //list[][][1] は //list[][][lineno=1] とみなす
        if v.nil? && k =~ /\A[0-9]+\z/
          opts['lineno'] = k.to_i
          next
        end
        #
        x = v ? "#{k}=#{v}" : k
        case k
        when 'fold', 'eolmark', 'foldmark', 'widecharfit'
          if vals.key?(v)
            opts[k] = vals[v]
          else
            error "#{yield}[#{x}]: expected 'on' or 'off'."
          end
        when 'lineno'
          if vals.key?(v)
            opts[k] = vals[v]
          elsif v =~ /\A\d+\z/
            opts[k] = v.to_i
          elsif v =~ /\A\d+-?\d*(?:\&+\d+-?\d*)*\z/
            opts[k] = v
          else
            error "#{yield}[#{x}]: expected line number pattern."
          end
        when 'linenowidth'
          if v =~ /\A-?\d+\z/
            opts[k] = v.to_i
          else
            error "#{yield}[#{x}]: expected integer value."
          end
        when 'fontsize'
          if v =~ /\A((x-|xx-)?small|(x-|xx-)?large)\z/
            opts[k] = v
          else
            error "#{yield}[#{x}]: expected small/x-small/xx-small."
          end
        when 'indent', 'indentwidth'
          if v =~ /\A\d+\z/
            k = 'indent'
            opts[k] = v.to_i
          elsif vals.key?(v)
            opts[k] = vals[v]
          else
            error "#{yield}[#{x}]: expected integer (>=0)."
          end
        when 'charspace'
          if v =~ /\A-?\d+(\.\d*)?\z/
            error "#{yield}[#{x}]: unit of measure required, such as '#{v}em'."
          elsif v =~ /\A-?\d+(\.\d*)?([a-zA-Z]+)?$/
            opts[k] = v
          else
            error "#{yield}[#{x}]: length expected (such as '0.04em')"
          end
        when 'lang'
          if v
            opts[k] = v
          else
            error "#{yield}[#{x}]: requires option value."
          end
        when 'file', 'encoding'
          v.present?  or
            error "#{yield}[#{x}]: requires #{k} name."
          errmsg = __send__("_check_#{k}_option", v)
          error "#{yield}[#{x}]: #{errmsg}" if errmsg
          opts[k] = v
        when 'classname'
          v.present?  or
            error "#{yield}[#{x}]: class name should not be empty."
          v =~ /\A[-\w]+\z/  or
            error "#{yield}[#{x}]: invalid class name."
          opts[k] = v
        else
          if i == 0 && v.nil?
            opts['lang'] = k    # for compatibility with Re:VIEW
          else
            error "#{yield}[#{x}]: unknown option."
          end
        end
      end
      return opts
    end

    alias _parse_codeblock_optionstr _codeblock_parse_options

    def _check_file_option(file)
      File.exist?(file)     or return "file not exist."
      File.file?(file)      or return "not a file."
      File.readable?(file)  or return "cannot read that file (maybe permission denied)."
      nil
    end

    def _check_encoding_option(encoding)
      Encoding.find(encoding)  or return "unknown encoding."
      nil
    end

    def _codeblock_read_file(filename, enc)
      encoding = enc ? "#{enc}:utf-8" : "utf-8"
      lines = File.open(filename, encoding: encoding) {|f| f.to_a }
      return lines
    end

    def _codeblock_eolmark()
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end

    def _codeblock_indentmark()
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end

    def _render_codeblock(blockname, lines, id, caption_str, opts)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end

    def _parse_inline(str, &b)
      en = enum_for(:_scan_inline_commands, str)
      buf = []
      _parse_inline_commands(en, buf, nil, &b)
      return buf.join()
    end

    def _scan_inline_commands(str)
      pos = 0
      str.scan(/(\@<\w+>[{|$])|(\\[}\\])|([}|$])/) do
        s1 = $1; s2 = $2; s3 = $3
        m = Regexp.last_match
        text = str[pos...m.begin(0)]
        pos = m.end(0)
        yield text, s1, s2, s3
      end
      remained = pos == 0 ? str : str[pos..-1]
      yield remained, nil, nil, nil
    end

    def _parse_inline_commands(en, buf, echar, &b)
      while true
        text, s1, s2, s3 = en.next()
        buf << (yield text) unless text.empty?
        if s1
          command = s1[2..-3]
          schar_ = s1[-1]
          echar_ = schar_ == '{' ? '}' : schar_
          if respond_to?("on_inline_#{command}")
            x = __send__("on_inline_#{command}") { "\0" }
          elsif respond_to?("inline_#{command}")
            x = __send__("inline_#{command}", "\0")
          else
            error "#{s1}#{echar_}: inline command not found."
          end
          stag, etag = x.split("\0", 2)
          buf << stag
          if _raw_inline_command?(command)
            errmsg = _parse_inline_commands(en, buf, echar_) {|text| text }
          else
            errmsg = _parse_inline_commands(en, buf, echar_, &b)
          end
          if errmsg
            error "#{s1}#{echar_}: #{errmsg}"
          end
          buf << etag
        elsif s2
          if echar == '}'
            buf << (yield s2[1..-1])
          else
            buf << (yield s2)
          end
        elsif s3
          if echar && echar == s3
            return
          else
            buf << (yield s3)
          end
        else
          echar.nil?  or
            return "inline command not closed."
          return
        end
      end
    end

    def _raw_inline_command?(cmd)
      return cmd == 'm'
    end

    def _build_caption_str(id, caption)
      str = ""
      with_context(:caption) do
        str = compile_inline(caption) if caption.present?
      end
      if id.present?
        number = _build_caption_number(id)
        prefix = "#{I18n.t('list')}#{number}#{I18n.t('caption_prefix')}"
        str = "#{prefix}#{str}"
      end
      return str
    end

    def _build_caption_number(id)
      chapter = get_chap()
      number = @chapter.list(id).number
      return chapter.nil? \
           ? I18n.t('format_number_header_without_chapter', [number]) \
           : I18n.t('format_number_header', [chapter, number])
    rescue KeyError
      error "no such list: #{id}"
    end

    public

    ## テーブル
    def table(lines, id=nil, caption=nil, option=nil)
      opts = _table_options(option) { "//table[#{id}][#{caption}]" }
      rows = _table_parse(lines, opts) { "//table[#{id}][#{caption}]" }
      return if rows.empty?
      #
      opts[:pos] = 'H' if ! opts[:pos] && ! _positioning_allowed_here?()
      #
      header_rows, has_header = _table_split_header(rows, opts)
      rows = adjust_n_cols(rows)
      #
      if opts[:hline] != nil  ; hline_default = opts[:hline]
      #elsif opts[:csv]       ; hline_default = false
      else                    ; hline_default = true
      end
      header_ncols = opts[:headercols] || (has_header ? 0 : 1)
      #
      _table_before(id, caption, opts)
      table_header(id, caption, opts)
      table_begin(rows.first.length, fontsize: opts[:fontsize])
      _render_table_rows(rows, header_rows,
                         header_ncols: header_ncols,
                         hline_default: hline_default)
      _table_bottom(hline: !hline_default)
      table_end()
      _table_after(id, caption, opts)
    end

    def _table_parse(lines, opts, &b)
      content = nil
      if opts[:file]
        content = _table_readfile(opts[:file], encoding: opts[:encoding], &b)
        opts[:csv] ||= (opts[:file] =~ /\.csv\z/i)
        lines = content.each_line unless opts[:csv]
      else
        content = lines.join() if opts[:csv]
      end
      rows = opts[:csv] ? _table_parse_csv(content) \
                        : _table_parse_txt(lines)
      return rows
    end

    def _table_parse_txt(lines)
      rows = []
      sepidx = nil
      rows = lines.map {|line|
        line.strip.split(/\t+/).map {|s| s.sub(/\A\./, '') }
      }
      return rows
    end

    def _table_parse_csv(csvstr)
      rows = CSV.parse(csvstr)
      return rows
    end

    def _table_readfile(filename, encoding: 'utf-8')
      _table_checkfile(filename)
      encoding ||= 'utf-8'
      Encoding.find(encoding)  or
        error(yield + "[encoding=#{encoding}]: unknown encoding.")
      #
      return File.read(filename, encoding: "#{encoding}:UTF-8")
    end

    def _table_checkfile(filename)
      File.exist?(filename)  or
        error(yield + "[file=#{filename}]: file not found.")
      File.file?(filename)  or
        error(yield + "[file=#{filename}]: not a file.")
      File.readable?(filename)  or
        error(yield + "[file=#{filename}]: file not readable (permission denied).")
    end

    def _table_split_header(rows, opts)
      has_header  = true
      top_nlines = 3  # 最初の3行以内にヘッダ区切りがあるか調べる
      if opts[:headerrows]
        header_rows = rows.shift(opts[:headerrows])
      elsif (sepidx = _table_headerline_index(rows, top_nlines))
        header_rows = rows.shift(sepidx)
        rows.shift  # ignore separator
      else
        header_rows = nil
        has_header  = false
      end
      return header_rows, has_header
    end

    def _table_headerline_index(rows, top_nlines=3)
      top_nlines.times do |i|
        return i if rows[i] && _table_headerlinerow?(rows[i])
      end
      return nil
    end

    def _table_headerlinerow?(row)
      return false if row.empty?
      #return true if row.all? {|s| !s.present? }
      return true if _table_headerline?(row[0]) && \
                     row[1..-1].all? {|s| !s.present? }
      return false
    end

    def _table_headerline?(line)
      return line =~ /\A={12,}\z/ || line =~ /\A-{12,}\z/
    end

    def _table_hline?(row)
      return true if row.empty?
      return true if row.all? {|s| !s.present? }
      #return true if row[0] =~ /\A-----+\z/ && \
      #               row[1..-1].all? {|s| !s.present? }
      return false
    end

    def _render_table_rows(rows, header_rows=nil, header_ncols: 0, hline_default: true)
      if header_rows
        n = header_rows.length - 1
        header_rows.each_with_index do |row, i|
          cells = row.map {|s| th(compile_inline(s)) }
          puts _table_tr(cells, hline: n == i)
        end
      end
      flags = rows.map {|row| _table_hline?(row) || nil }
      rows.each_with_index do |row, i|
        next if flags[i]   # skip '-----'
        cells = row.map {|s| compile_inline(s) }
        if header_ncols == 0
          cells = cells.map {|s| td(s) }
        elsif header_ncols == 1
          cells = [th(cells.shift)] + cells.map {|s| td(s) }
        else
          n = header_ncols
          cells = cells.shift(n).map {|s| th(s) } + cells.map {|s| td(s) }
        end
        hline = hline_default ? true : flags[i+1]
        puts _table_tr(cells, hline: hline)
      end
    end

    def _table_options(option_str, &b)
      opts = {}
      return opts unless option_str.present?
      _each_block_option(option_str) do |k, v|
        case k
        when 'file'
          v.present?  or
            error(yield + "[#{k}=]: filename required.")
          opts[:file] = v
        when 'encoding'
          v.present?  or
            error(yield + "[#{k}=]: encoding name required.")
          opts[:encoding] = v
        when 'csv', 'hline'
          sym = k.intern
          if ! v.present?  ; opts[sym] = true
          elsif v == 'on'  ; opts[sym] = true
          elsif v == 'off' ; opts[sym] = false
          else
            error(yield + "[#{k}=#{v}]: 'on' or 'off' expected.")
          end
        when 'pos'
          _validate_positioning_option(k, v, &b)
          opts[:pos] = v
        when 'fontsize'
          case v
          when 'small', 'x-small', 'xx-small'
          when 'large', 'x-large', 'xx-large'
          when 'medium'
          else
            error(yield + "[#{k}=#{v}]: invalid font size.")
          end
          opts[:fontsize] = v
        when 'headerrows', 'headercols'
          v =~ /\A\d+\z/  or
            error(yield + "[#{k}=#{v}]: integer expected.")
          opts[k.intern] = v.to_i
        else
          error(yield + "[#{k}=#{v}]: unknown option.")
        end
      end
      return opts
    end

    def _table_before(id, caption, opts)
    end

    def _table_after(id, caption, opts)
    end

    def _table_bottom(hline: false)
      nil
    end

    def _table_tr(cells, hline: false)
      tr(cells)
    end

    def _table_th(x)
      th(x)
    end

    def _table_td(x)
      td(x)
    end

    public

    ## ブロック命令を上書き

    def tsize(target, str=nil)
      ## //tsize[|latex||lcr|]  ← Re:VIEW original
      ## //tsize[latex][|lcr|]  ← Starter extended
      if str.nil?
        if target =~ /\A\|([^\|]*)\|(.*)/
          target, str = $1, $2
        else
          target, str = nil, target
        end
      end
      if target.nil? || target.empty? || target == '*'
        @tsize = str
      else
        builders = target.split(',').map {|x| x.strip }
        c = self.class.to_s.gsub('ReVIEW::', '').gsub('Builder', '').downcase
        @tsize = str if builders.include?(c)
      end
    end

    ## //imgtable
    def imgtable(lines, id, caption=nil, option=nil)
      @chapter.image(id).bound?  or
        error "//imgtable[#{id}]: image not found."
      opts, metric = _imgtable_parse_options(option) { "//imgtable[#{id}][#{caption}]" }
      opts['pos'] = 'H' if ! opts['pos'] && ! _positioning_allowed_here?()
      _render_imgtable(id, caption, opts) do
        with_context(:caption) do
          _render_imgtable_caption(caption)
        end
        _render_imgtable_label(id)
        imgtable_image(id, caption, metric)
      end
    end

    def _imgtable_parse_options(option_str, &b)
      opts = {}; metric = []
      _each_block_option(option_str) do |k, v|
        case k
        when 'pos'
          _validate_positioning_option(k, v, &b)
          opts[k] = v
        else
          metric << (v ? "#{k}=#{v}" : k)
        end
      end
      return opts, metric.join()
    end

    def _render_imgtable(id, caption, opts)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented.")
    end

    def _render_imgtable_caption(caption)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented.")
    end

    def _render_imgtable_label(id)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented.")
    end

    ## 章 (Chapter) の概要
    def on_abstract_block()
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented.")
    end

    ## 章 (Chapter) の著者
    def on_chapterauthor_block(name)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented.")
    end

    ## 会話リスト
    def on_talklist_block(option=nil, &b)
      opts = _talklist_parse_options(option) { "//talklist" }
      _render_talklist(opts) do
        yield
      end
    end

    def _talklist_parse_options(option_str, &b)
      opts = {}
      _each_block_option(option_str) do |k, v|
        case k
        when 'indent'
        when 'imagewidth'
        when 'imageheight'
        when 'needvspace'
        when 'itemmargin'
        when 'listmargin'
        #
        when 'imageborder'
          case v
          when nil   ;  v = true
          when 'on'  ;  v = true
          when 'off' ;  v = false
          else
            raise "#{yield}[#{k}=#{v}]: unexpected value; 'on' or 'off' expected."
          end
        #
        when 'separator', 'itemstart', 'itemend'
          case v
          when /\A"(.*)"\z/  ; v = $1
          when /\A'(.*)'\z/  ; v = $1
          end
        #
        when 'classname'
        else
          error "#{yield}[#{k}=#{v}]: unknown talklist option."
        end
        opts[k.intern] = v
      end
      return opts
    end

    ## 会話項目
    def on_talk_block(imagefile, name=nil, text=nil, &b)
      if imagefile.present?
        imgpath = find_image_filepath(imagefile)  or
          error "//talk[#{imagefile}]: image file not found."
      else
        imgpath = nil
      end
      _render_talk(imgpath, name) do
        if text.nil?
          yield
        else
          puts ""
          puts compile_inline(text)
        end
      end
    end

    ## 会話項目（ショートカット用）
    def on_t_block(key, text=nil, &b)
      dict = self.config_starter['talk_shortcuts']  or
        error "//t[#{key}]: missing 'talk_shortcuts:' setting in 'config-starter.yml'."
      item = dict[key]  or
        error "//t[#{key}]: key not registered in 'config-starter.yml'."
      on_talk_block(item['image'], item['name'], text, &b)
    end

    ## キーと説明文のリスト
    def on_desclist_block(option=nil, &b)
      opts = _desclist_parse_option(option) { "//desclist" }
      _render_desclist(opts) do
        yield
      end
    end

    def _desclist_parse_option(option_str)
      opts = {}
      return opts unless option_str.present?
      _each_block_option(option_str) do |k, v|
        case k
        when 'indent', 'space', 'listmargin', 'itemmargin'
          v.present?  or
            error "[#{k}]: value required."
        when 'bold', 'compact'
          case v
          when nil, ''  ; v = true
          when 'on'     ; v = true
          when 'off'    ; v = false
          else
            error yield + "[#{k}=#{v}]: expected 'on' or 'off'."
          end
        when 'classname'
        else
          error yield + "[#{k}]: unknown option."
        end
        opts[k.intern] = v
      end
      return opts
    end

    ## キーと値
    def on_desc_block(key, text=nil, &b)
      _render_desc(key) do
        if text.nil?
          yield
        else
          #puts ""
          puts compile_inline(text)
        end
      end
    end

    ## 縦方向の空きを入れる
    def vspace(target, size)
      if _current_builder?(target)
        _render_vspace(size)
      end
    end

    def addvspace(target, size)
      if _current_builder?(target)
        _render_addvspace(size)
      end
    end

    def _current_builder?(target)
      return true if target.nil? || target.empty?
      return true if target == '*'
      c = self.class.to_s.gsub('ReVIEW::', '').gsub('Builder', '').downcase
      return target.split(',').any? {|x| x.strip == c }
    end

    ## 縦方向のスペースがなければ改ページ
    def needvspace(target_name, height)
      if _current_target?(target_name)
        _render_needvspace(height)
      end
    end

    ## 生コード埋め込み
    def embed(lines, target=nil)
      yes = _current_target?(target)
      puts lines.join() if yes
    end

    ## インライン命令のバグ修正

    def inline_raw(str)
      name = target_name()
      if str =~ /\A\|(.*?)\|/
        str = $'
        return "" unless $1.split(',').any? {|s| s.strip == name }
      end
      return str.gsub('\\n', "\n")
    end

    def inline_embed(str)
      name = target_name()
      if str =~ /\A\|(.*?)\|/
        str = $'
        return "" unless $1.split(',').any? {|s| s.strip == name }
      end
      return str
    end

    ## インライン命令を入れ子に対応させる

    def on_inline_href
      escaped_str, items = yield true
      url = label = nil
      separator1 = /, /
      separator2 = /(?<=[^\\}]),/  # 「\\,」はセパレータと見なさない
      [separator1, separator2].each do |sep|
        pair = items[0].split(sep, 2)
        if pair.length == 2
          url = pair[0]
          label = escaped_str.split(sep, 2)[-1]  # 「,」がエスケープされない前提
          break
        end
      end
      url ||= items[0]
      url = url.gsub(/\\,/, ',')   # 「\\,」を「,」に置換
      return build_inline_href(url, label)
    end

    def on_inline_ruby
      escaped_str = yield
      arr = escaped_str.split(', ')
      if arr.length > 1                 # ex: @<ruby>{小鳥遊, たかなし}
        yomi = arr.pop().strip()
        word = arr.join(', ')
      elsif escaped_str =~ /,([^,]*)\z/ # ex: @<ruby>{小鳥遊,たかなし}
        word, yomi = $`, $1.strip()
      else
        error "@<ruby>: missing yomi, should be '@<ruby>{word, yomi}' style."
      end
      return build_inline_ruby(word, yomi)
    end

    ## 節 (Section) や項 (Subsection) を参照する。
    ## 引数 id が節や項のラベルでないなら、エラー。
    ## 使い方： @<secref>{label}
    def inline_secref(id)  # 参考：ReVIEW::Builder#inline_hd(id)
      ## 本来、こういった処理はParserで行うべきであり、Builderで行うのはおかしい。
      ## しかしRe:VIEWのアーキテクチャがよくないせいで、こうせざるを得ない。無念。
      sec_id = id
      chapter = nil
      if id =~ /\A([^|]+)\|(.+)/
        chap_id = $1; sec_id = $2
        chapter = @book.contents.detect {|chap| chap.id == chap_id }  or
          error "@<secref>{#{id}}: chapter '#{chap_id}' not found."
      end
      begin
        _inline_secref(chapter || @chapter, sec_id)
      rescue KeyError
        error "@<secref>{#{id}}: section (or subsection) not found."
      end
    end

    private

    def _inline_secref(chap, id)
      sec_id = chap.headline(id).id
      num, title = _get_secinfo(chap, sec_id)
      level = num.split('.').length
      #
      secnolevel = @book.config['secnolevel']
      if secnolevel + 1 < level
        error "'secnolevel: #{secnolevel}' should be >= #{level-1} in config.yml"
      ## config.ymlの「secnolevel:」が3以上なら、項 (Subsection) にも
      ## 番号がつく。なので、節 (Section) のタイトルは必要ない。
      elsif secnolevel + 1 > level
        parent_title = nil
      ## そうではない場合は、節 (Section) と項 (Subsection) とを組み合わせる。
      ## たとえば、"「1.1 イントロダクション」内の「はじめに」" のように。
      elsif secnolevel + 1 == level
        parent_id = sec_id.sub(/\|[^|]+\z/, '')
        _, parent_title = _get_secinfo(chap, parent_id)
      else
        raise "not reachable"
      end
      #
      return _build_secref(chap, num, title, parent_title)
    end

    def _get_secinfo(chap, id)  # 参考：ReVIEW::LATEXBuilder#inline_hd_chap()
      num = chap.headline_index.number(id)
      caption = compile_inline(chap.headline(id).caption)
      if chap.number && @book.config['secnolevel'] >= num.split('.').size
        caption = "#{chap.headline_index.number(id)} #{caption}"
      end
      #title = I18n.t('chapter_quote', caption)
      title = caption
      return num, title
    end

    def _build_secref(chap, num, title, parent_title)
      raise NotImplementedError.new("#{self.class.name}#_build_secref(): not implemented yet.")
    end

    ##

    public

    ## ノートを参照する
    def inline_noteref(label)
      begin
        chapter, label = parse_reflabel(label)
      rescue KeyError => ex
        error "@<noteref>{#{label}}: #{ex.message}"
      end
      begin
        item = (chapter || @chapter).note(label)
      rescue KeyError => ex
        error "@<noteref>{#{label}}: note not found."
      end
      build_noteref(chapter, label, item.caption)
    end

    ## 数式を参照する
    def inline_eq(label)
      begin
        chapter, label = parse_reflabel(label)
      rescue KeyError => ex
        error "@<eq>{#{label}}: #{ex.message}"
      end
      begin
        item = (chapter || @chapter).equation(label)
      rescue KeyError => ex
        error "@<eq>{#{label}}: equation not found."
      end
      build_eq(chapter || @chapter, label, item.number)
    end

    protected

    def build_noteref(chapter, label, caption)
      raise NotImplementedError.new("#{self.class.name}#build_noteref(): not implemented yet.")
    end

    def build_eq(chapter, label, caption)
      raise NotImplementedError.new("#{self.class.name}#build_noteref(): not implemented yet.")
    end

    def parse_reflabel(label)
      ## 本来ならParserで行うべきだけど仕方ない。
      chapter = nil
      if label =~ /\A([^|]+)\|(.+)/
        chap_id = $1; label = $2
        chapter = @book.contents.detect {|chap| chap.id == chap_id }  or
          raise KeyError.new("chapter '#{chap_id}' not found.")
        return chapter, label
      end
      return chapter, label
    end

    ##

    protected

    def find_image_filepath(image_id)
      finder = get_image_finder()
      filepath = finder.find_path(image_id)
      return filepath
    end

    def get_image_finder()
      imagedir = "#{@book.basedir}/#{@book.config['imagedir']}"
      types    = @book.image_types
      builder  = @book.config['builder']
      chap_id  = @chapter.id
      return ReVIEW::Book::ImageFinder.new(imagedir, chap_id, builder, types)
    end

    public

    ## 画像ファイルが見つからなければエラーとするよう変更
    def image(lines, id, caption, option=nil)
      image = @chapter.image(id)
      image.bound?  or
        error "//image[#{id}]: image not found."
      image_filepath = image.path
      opts = _image_parse_options(option) { "//image[#{id}][#{caption}]" }
      opts[:pos] = 'H' if ! opts[:pos] && ! _positioning_allowed_here?()
      _render_image(id, image.path, caption, opts)
    end

    def _render_image(id, image_filepath, caption, opts)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end

    def indepimage(lines, id, caption=nil, option=nil)
      image = @chapter.image(id)
      image.bound?  or
        error "//indepimage[#{id}]: image not found."
      image_filepath = image.path
      opts = _image_parse_options(option) { "//indepimage[#{id}][#{caption}]" }
      opts[:pos] = 'H' if ! opts[:pos] && ! _positioning_allowed_here?()
      _render_indepimage(id, image.path, caption, opts)
    end
    alias_method :numberlessimage, :indepimage

    def _render_indepimage(id, image_filepath, caption, opts)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end

    def _image_parse_options(option_str, &b)
      opts = {}
      _each_block_option(option_str) do |k, v|
        case k
        when 'pos'
          _validate_positioning_option(k, v, &b)
        when 'border', 'draft'
          case v
          when nil  ; v = true
          when 'on' ; v = true
          when 'off'; v = false
          else
            error "#{yield}[#{k}=#{v}]: expected '#{k}=on' or '#{k}=off'"
          end
        when 'scale'
          case v
          when /\A\d+\.\d*\z/, /\A\.\d+\z/
          when /\A\d+(\.\d+)?%\z/
          else
            error "#{yield}[#{k}=#{v}]: invalid scale value."
          end
        when 'width'
          case v
          when /\A[\d.]+\z/
            error "#{yield}[#{k}=#{v}]: unit of measure required (for example: 80%, 200px, 50mm)."
          end
        when 'style'
          if v =~ /\A"(.*?)"\z/ || v =~ /\A'(.*?)'\z/
            v = $1
          end
        when 'class'
        else
          error "#{yield}[#{k}=#{v}]: unknown image option."
        end
        opts[k.intern] = v
      end
      return opts
    end

    def _validate_positioning_option(k, v, &b)
      v.present?  or
        error "#{yield}[#{k}=]: position char required."
      _positioning_allowed_here?() || v == 'H'  or
        error "#{yield}[#{k}=#{v}]: positioning not allowed here; please remove `pos=#{v}' option, or use `pos=H' instead."
      v =~ /\A[hHtbp]+\z/  or  # H: Here, h: here, t: top, b: bottom, p: page
        error "#{yield}[#{k}=#{v}]: contains invalid char (availables: 'h', 'H', 't', 'b', 'p', or combination of them)."
    end

    def _positioning_allowed_here?
      return true  if within_context?(:note)       # //note の中はOK
      return false if within_context?(:minicolumn) # //info や //caution の中はダメ
      return false if within_context?(:column)     # ==[column] の中はダメ
      return true                                  # それ以外はOK
    end

    ## LaTeXでは「``」と「''」で囲み、HTMLでは「“」と「”」で囲む
    def on_inline_qq()
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented.")
    end

    ## 索引に載せる用語（@<term>{}, @<idx>{}, @<hidx>{}）
    def inline_idx(str)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end
    def inline_hidx(str)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end
    def inline_term(str)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end
    def inline_termnoidx(str)
      raise NotImplementedError.new("#{self.class.name}##{__method__}(): not implemented yet.")
    end
    def parse_term(str, placeholder_str)
      @terms_dict ||= {}   # key: term, value: yomigana
      #
      see = nil
      if str =~ %r`==>>(.*?)\z`
        str = $`
        see = $1
      end
      #
      display_str = ""
      tmpchar = "\x08"
      placeholder_rexp = TERM_PLACEHOLDER_REXP   # /---/
      str.split('<<>>').each do |item|
        if item =~ /\(\((.*?)\)\)\z/
          term = $`
          yomi = $1
          @terms_dict[term] = yomi   # may override existing key
        elsif @terms_dict[item]
          term = item
          yomi = @terms_dict[item]
        else
          term = item
          yomi = _find_yomi(term)
          @terms_dict[term] = yomi
        end
        if ! display_str.empty? && term =~ placeholder_rexp
          display_str = compile_inline(term.gsub(placeholder_rexp, tmpchar)).gsub(tmpchar, display_str)
        else
          display_str += compile_inline(term)
        end
        term_e = compile_inline(term.gsub(placeholder_rexp, tmpchar))
        term_e = escape_index(term_e).gsub(tmpchar, placeholder_str)
        yield term, term_e, yomi
      end
      return display_str, see
    end
    protected :parse_term

    TERM_PLACEHOLDER_REXP = /---/

    def _find_yomi(term)
      if @index_db
        yomi = @index_db[term]
        return yomi if yomi
      end
      return nil  if term =~ /\A[[:ascii:]]+\Z/ || @index_mecab.nil?
      return _to_yomigana(term)
    end
    private :_find_yomi

    def _to_yomigana(term)
      return NKF.nkf('-w --hiragana', @index_mecab.parse(term).force_encoding('UTF-8').chomp)
    end
    private :_to_yomigana

    def escape_index(str)
      str
    end

    ## キーを単語へ展開する（@<w>{}, @<wb>{}, @<W>{}）
    def inline_w(str)
      key = str
      @words_dict ||= _load_words_file(@book.config['words_file'], key)
      unless @words_dict.key?(key)
        filenames = [@book.config['words_file']].flatten
        error "@<w>{#{key}}: key '#{key}' not found in words file (#{filenames.join(', ')})."
      end
      return escape(@words_dict[key])
    end

    def inline_wb(str)
      inline_b(inline_w(str))
    end

    def inline_W(str)
      inline_strong(inline_w(str))
    end

    private

    def _load_words_file(words_files, key)
      words_files.present?  or
        error "`@<w>{#{key}}`: `words_file:` not configured in config.yml."
      filepaths = [words_files].flatten.compact
      filepaths.each do |filepath|
        _validate_words_file(filepath, key)
      end
      #
      dict = {}
      filepaths.each do |filepath|
        case filepath
        when /\.csv/i
          _load_words_file_csv(filepath, dict)
        when /\.tsv/i, /\.txt/i
          _load_words_file_txt(filepath, dict)
        else
          raise "uneachable: filepath=#{filepath.inspect}"
        end
      end
      return dict
    end

    def _validate_words_file(filepath, key)
      File.exist?(filepath)  or
        error "`@<w>{#{key}}`: words file `#{filepath}` not found."
      File.file?(filepath)  or
        error "`@<w>{#{key}}`: words file `#{filepath}` should be a file, but not."
      File.readable?(filepath)  or
        error "`@<w>{#{key}}`: cannot read words file `#{filepath}`."
      filepath =~ /\.(csv|tsv|txt)/i  or
        error "`@<w>{#{key}}`: words file `#{filepath}` should be *.csv, *.tsv, or *.txt."
    end

    def _load_words_file_csv(filepath, dict)
      require 'csv'
      CSV.read(filepath, :encoding=>'utf-8').each do |row|
        next if row.length < 2
        key, val, = row
        dict[key] = val if key.present? && val.present?
      end
      return dict
    end

    def _load_words_file_txt(filepath, dict)
      File.open(filepath, :encoding=>'utf-8') do |f|
        f.each do |line|
          next if line =~ /\A\#/
          key, val, = line.chomp.split(/\t+/)
          dict[key] = val if key.present? && val.present?
        end
      end
      return dict
    end

  end


  ##
  ## 行番号を生成するクラス。
  ##
  ##   gen = LineNumberGenerator.new("1-3&8-10&15-")
  ##   p gen.each.take(15).to_a
  ##     #=> [1, 2, 3, nil, 8, 9, 10, nil, 15, 16, 17, 18, 19, 20, 21]
  ##
  class LineNumberGenerator

    def initialize(arg)
      @ranges = []
      inf = Float::INFINITY
      case arg
      when true        ; @ranges << (1 .. inf)
      when Integer     ; @ranges << (arg .. inf)
      when /\A(\d+)\z/ ; @ranges << (arg.to_i .. inf)
      else
        arg.split('&', -1).each do |str|
          case str
          when /\A\z/
            @ranges << nil
          when /\A(\d+)\z/
            @ranges << ($1.to_i .. $1.to_i)
          when /\A(\d+)\-(\d+)?\z/
            start = $1.to_i
            end_  = $2 ? $2.to_i : inf
            @ranges << (start..end_)
          else
            raise ArgumentError.new("'#{arg}': invalid lineno format")
          end
        end
      end
    end

    def each(&block)
      return enum_for(:each) unless block_given?
      for range in @ranges
        range.each(&block) if range
        yield nil
      end
      nil
    end

  end


end
