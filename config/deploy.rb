# RVM bootstrap
$:.unshift(File.expand_path("~/.rvm/lib"))
require 'rvm/capistrano'
set :rvm_ruby_string, '1.8.7'
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
set :deploy_to, "/var/www/vhosts/rails/elite-house/"
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

  desc "Symlink shared resources on each release - not used"
  task :symlink_shared, :roles => :app do
    #run "ln -nfs #{shared_path}/config/database.yml #{release_path}/config/database.yml"
  end
end

after 'deploy:update_code', 'deploy:symlink_shared'

