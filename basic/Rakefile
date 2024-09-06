##
## Don't change this file!!
## Instead, edit 'lib/tasks/mytasks.rake' file.
##

## `gem install foobar` will raise error in macOS.
## the following is a hack to avoid that error.
rubygems_dir = File.join(Dir.pwd, 'rubygems')
if ENV['GEM_HOME'].to_s.empty? && File.directory?(rubygems_dir)
  #ENV['GEM_HOME'] = rubygems_dir
  Gem.paths = {'GEM_HOME' => rubygems_dir}
end
Dir.glob('lib/tasks/*.rake').each do |file|
  load(file)
end

##
desc "+ list tasks"
task :help do
  sh "rake -T"
end

task(:default).clear
task :default => (ENV['RAKE_DEFAULT'] || :help)
