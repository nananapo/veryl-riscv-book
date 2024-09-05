# -*- coding: utf-8 -*-

##
## ReVIEW::PDFMaker から、CLIに関する機能を分離する
##

require 'optparse'


module ReVIEW


  class CLI

    def initialize(script_name)
      @script_name = script_name
    end

    def parse_opts(args)
      parser = OptionParser.new
      parser.banner = "Usage: #{@script_name} <config.yaml>"
      parser.version = ReVIEW::VERSION
      cmdopts = {}
      parser.on('-h', '--help', 'Prints this message and quit.') do
        cmdopts['help'] = true
      end
      parser.on('--[no-]debug', 'Keep temporary files.') do |debug|
        cmdopts['debug'] = debug
      end
      parser.on('--ignore-errors', 'Ignore review-compile errors.') do
        cmdopts['ignore-errors'] = true
      end
      yield parser, cmdopts if block_given?
      @_cmdopt_parser = parser
      parser.parse!(args)
      #
      return cmdopts, args if cmdopts['help']
      #
      if args.length < 1
        raise OptionParser::InvalidOption.new("Config filename required.")
      elsif args.length > 1
        raise OptionParser::InvalidOption.new("Too many arguments.")
      end
      config_filename = args[0]
      File.exist?(config_filename)  or
        raise OptionParser::InvalidOption.new("file '#{config_filename}' not found.")
      #
      return cmdopts, config_filename
    end

    def help_message
      return @_cmdopt_parser.help
    end

  end


end
