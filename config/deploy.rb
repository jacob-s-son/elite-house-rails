# RVM bootstrap
$:.unshift(File.expand_path("~/.rvm/lib"))
require 'rvm/capistrano'
set :rvm_ruby_string, '1.8.7@elite-house'
set :rvm_type, :user

# stages
set :stages, %w(production_test production)
set :default_stage, "production_test"
require 'capistrano/ext/multistage'

# bundler bootstrap
require 'bundler/capistrano'

# main details
set :application, "Schenker-WebBooking"
role :web, "ejekabsons.com"
role :app, "ejekabsons.com"
role :db,  "ejekabsons.com", :primary => true

# server details
default_run_options[:pty] = true
ssh_options[:forward_agent] = true
set :deploy_via, :remote_cache
set :user, "passenger"
set :runner, "passenger"
set :use_sudo, false

# repo details
set :scm, :git
set :scm_username, "passenger"
set :repository, "git@github.com:jacob-s-son/elite-house-rails.git"
set :branch, "develop"
set :git_enable_submodules, 1

# rails env
set(:rails_env) { "#{stage}" }

# tasks
namespace :deploy do
  require 'FileUtils'
  task :start, :roles => :app do
    run "touch #{current_path}/tmp/restart.txt"
  end

  task :stop, :roles => :app do
    # Do nothing.
  end

  desc "Restart Application"
  task :restart, :roles => :app do
    run "touch #{current_path}/tmp/restart.txt"
  end
  
  desc "Copies shared resources if do not exist"
  task :copy_db, :roles => :app do
    shared_path = "#{shared_path}/system/#{stage}.sqlite3"
    local_path = "#{release_path}/db/#{stage}.sqlite3"
    
    FileUtils.cp(local_path, shared_path) unless File.exists?(shared_path)
  end

  desc "Symlink shared resources on each release - not used"
  task :symlink_shared, :roles => :app do
    run <<-CMD
      ln -nfs #{shared_path}/system/#{stage}.sqlite3 #{release_path}/db/#{stage}.sqlite3
    CMD
  end
end

after 'deploy:update_code', 'deploy:copy_db', 'deploy:symlink_shared'


