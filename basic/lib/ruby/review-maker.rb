# -*- coding: utf-8 -*-

##
## ReVIEW::PDFMaker から他のMakerでも使える機能を分離する
##

require 'pathname'
require 'open3'

require 'review/logger'
require 'review/version'
require 'review/configure'
require 'review/yamlloader'
require 'review/i18n'
require 'review/book'
require 'review/template'

require_relative './review-cli'


module ReVIEW


  class Maker

    attr_accessor :config, :basedir
    attr_reader :maker_name

    def initialize(config_filename, optional_values={})
      @basedir     = File.dirname(config_filename)
      @basehookdir = File.absolute_path(@basedir)
      @logger      = ReVIEW.logger
      @maker_name  = self.class.name.split('::')[-1].downcase()
      @config      = load_config(config_filename, optional_values)
      @config.maker = @maker_name
      @config.check_version(ReVIEW::VERSION)   # may raise ReVIEW::ConfigError
      #
      #yamlfile = File.join(@basedir, 'config-starter.yml')
      #yamldata = File.open(yamlfile) {|f| YAML.safe_load(f) }
      #@starter_config = yamldata['starter']
      @starter_config = @config['starter']
    end

    def self.execute(*args)
      script_name = self.const_get(:SCRIPT_NAME)
      cli = CLI.new(script_name)
      begin
        cmdopts, config_filename = cli.parse_opts(args)
      rescue OptionParser::InvalidOption => ex
        $stderr.puts "Error: #{ex.message}"
        $stderr.puts cli.help_message()
        return 1
      end
      if cmdopts['help']
        puts cli.help_message()
        return 0
      end
      #
      maker = nil
      begin
        maker = self.new(config_filename, cmdopts)
        return maker.generate()
      rescue ApplicationError, ReVIEW::ConfigError => ex
        raise if maker && maker.config['debug']
        error(ex.message)
      end
    end

    def generate()
      raise NotImplementedError.new("#{self.class.name}#generate(): not implemented yet.")
    end

    def debug?
      return @config['debug']
    end

    protected

    def load_config(config_filename, additionals={})
      begin
        config_data = ReVIEW::YAMLLoader.new.load_file(config_filename)
      rescue => ex
        error "yaml error #{ex.message}"
      end
      #
      config = ReVIEW::Configure.values
      config.deep_merge!(config_data)
      # YAML configs will be overridden by command line options.
      config.deep_merge!(additionals)
      I18n.setup(config['language'])
      #
      validate_config(config)
      #
      if ENV['STARTER_CHAPTER'].present?
        modify_config(config)
      end
      #
      return config
    end

    def modify_config(config)
      config.deep_merge!({
        'toc'        => false,
        'cover'      => false,
        'coverimage' => nil,
        'titlepage'  => false,
        'titlefile'  => nil,
        'colophon'   => nil,
        'pdfmaker' => {
          'colophon'   => nil,
          'titlepage'  => nil,
          'coverimage' => nil,
        },
      })
    end

    def load_book()
      book = ReVIEW::Book.load(@basedir)  # also loads 'review-ext.rb'
      book.config = @config
      return book
    end

    def validate_config(config)
      _validate_obsoletes(config)
      _validate_pdffiles(config)
    end

    private

    def _validate_obsoletes(config)
      d = config['pdfmaker']
      return unless d
      obsolete_keys = ['coverpdf_files', 'backcoverpdf_files', 'coverpdf_option']
      if obsolete_keys.any? {|key| d.key?(key) }
        errmsg = CONFIG_PDFFILES_ERRMSG
        $stderr.puts "\033[0;31m\n#{errmsg}\033[0m"
        error "obsolete config entry exists."
      end
    end

    CONFIG_PDFFILES_ERRMSG = <<END
***** ERROR *****
'config.yml' contains old entries.

Please move the followings from 'config.yml' ...

  * coverpdf_files:
  * backcoverpdf_files:
  * coverpdf_option:

into 'config-starter.yml' with renaming to ...

  * frontcover_pdffile:
  * backcover_pdffile:
  * includepdf_option:
END

    def _validate_pdffiles(config)
      d = config['starter']
      return unless d
      imagedir = config['imagedir']
      pdffile_keys = ['frontcover_pdffile', 'backcover_pdffile', 'titlepage_pdffile', 'colophon_pdffile']
      pdffile_keys.each do |key|
        [d[key]].flatten.compact.each do |pdffile|
          pdffile = pdffile.gsub(/(<.*?>)?\*?\z/, '')
          errmsg = _validate_pdffile(File.join(imagedir, pdffile))
          error "(config-starter.yml) '#{key}: #{pdffile}': #{errmsg}" if errmsg
        end
      end
      #
      key = 'includepdf_option'; val = d[key]
      if val.present?
        val =~ /\Aoffset=/  or
          error "(config-starter.yml) '#{key}: #{val}': unexpected value. only 'offset=...' available here."
      end
    end

    def _validate_pdffile(filepath)
      filepath =~ /\.pdf\z/i  or
        return "expected pdf file ('*.pdf'), but not."
      return _validate_file(filepath)
    end

    def _validate_file(filepath)
      File.exist?(filepath)     or return "file not found."
      File.file?(filepath)      or return "not a file."
      File.readable?(filepath)  or return "cannot read (permission denied?)."
      return nil
    end

    protected

    def system_or_raise(*args)
      Kernel.system(*args) or raise("failed to run command: #{args.join(' ')}")
    end

    def self.error(msg)
      $stderr.puts "ERROR: #{File.basename($PROGRAM_NAME, '.*')}: #{msg}"
      exit 1
    end

    def error(msg)
      @logger.error "#{File.basename($PROGRAM_NAME, '.*')}: #{msg}"
      exit 1
    end

    def self.warn(msg)
      $stderr.puts "Waring: #{File.basename($PROGRAM_NAME, '.*')}: #{msg}"
    end

    def warn(msg)
      @logger.warn "#{File.basename($PROGRAM_NAME, '.*')}: #{msg}"
    end

    def empty_dir(path)
      if File.directory?(path)
        Pathname.new(path).children.each {|x| x.rmtree() }
      end
      path
    end

    def echoback(cmd)
      puts ""
      puts "[#{@maker_name}]$ #{cmd}"
    end

    def run_cmd(cmd)
      time = @_usr_bin_time ? "time " : ""
      echoback("#{time}#{cmd}")
      return Kernel::system(cmd)
    end

    def run_cmd!(cmd)
      run_cmd(cmd)  or raise("failed to run command: #{cmd}")
    end

    def run_cmd_capturing_output(cmd, append=nil)
      time = @_usr_bin_time ? "time " : ""
      echoback("#{time}#{cmd}#{append}")
      output, status = Open3.capture2(cmd)
      return output, status.success?
    end

    def usr_bin_time(&b)
      result = nil
      @_usr_bin_time = true
      start_t = Time.now
      ptime1  = Process.times
      result  = yield
      end_t   = Time.now
      ptime2  = Process.times
      @_usr_bin_time = false
      #
      real_time = end_t - start_t
      user_time = ptime2.cutime - ptime1.cutime
      sys_time  = ptime2.cstime - ptime1.cstime
      format    = "%12.2f real %12.2f user %12.2f sys"
      $stderr.puts format % [real_time, user_time, sys_time]
      #
      return result
    end
    protected :usr_bin_time

    def call_hook(hookname)
      d = @config[@maker_name]
      return unless d.is_a?(Hash)
      return unless d[hookname]
      if ENV['REVIEW_SAFE_MODE'].to_i & 1 > 0
        warn 'hook configuration is prohibited in safe mode. ignored.'
        return
      end
      ## hookname が文字列の配列なら、それらを全部実行する
      basehookdir = @basehookdir
      [d[hookname]].flatten.each do |hook|
        script = File.absolute_path(hook, basehookdir)
        ## 拡張子が .rb なら、rubyコマンドで実行する（ファイルに実行属性がなくてもよい）
        if script.end_with?('.rb')
          ruby = ruby_fullpath()
          ruby = "ruby" unless File.exist?(ruby)
          run_cmd!("#{ruby} #{script} #{Dir.pwd} #{basehookdir}")
        else
          run_cmd!("#{script} #{Dir.pwd} #{basehookdir}")
        end
      end
    end

    def ruby_fullpath
      c = RbConfig::CONFIG
      return File.join(c['bindir'], c['ruby_install_name']) + c['EXEEXT'].to_s
    end

    def colored_errmsg(msg)
      #return msg unless $stderr.tty?
      return "\033[0;31m#{msg}\033[0m"
    end

  end


  class BaseRenderer
    include ERB::Util

    def initialize(config, book, basedir, starter_config)
      @config  = config
      @book    = book
      @basedir = basedir
      @starter_config = starter_config
    end

    def render(context={})
      context.each {|k, v| instance_variable_set("@#{k}", v) }
      tmpl_filename ||= layout_template_name()
      tmpl_filepath = find_layout_template(tmpl_filename)
      return render_template(tmpl_filepath)
    end

    def generate_file(filepath, context={})
      content = render(context)
      File.open(filepath, 'wb') {|f| f.write(content) }
      return content
    end

    protected

    def layout_template_name()
      raise NotImplementedError.new("#{self.class.name}#template_name(): not implemented yet.")
    end

    def find_layout_template(filename)
      filepath = File.join(@basedir, 'layouts', File.basename(filename))
      return filepath if File.exist?(filepath)
      return File.expand_path(filename, ReVIEW::Template::TEMPLATE_DIR)
    end

    def render_template(filepath)
      return ReVIEW::Template.load(filepath, '-').result(binding())
    end

    def i18n(*args)
      ReVIEW::I18n.t(*args)
    end

  end


end
