class Admin::BaseController < ApplicationController
  layout 'admin/application'
  USERS = { "admin" => "onl1-el1te-h0use-stuff" }
  before_filter { |c| c.authenticate if RAILS_ENV == "production"}
  
  def admin_actions
    render "admin_actions"
  end
  
  private
  def authenticate
    authenticate_or_request_with_http_basic do |username, password|
      username == USERS.keys.first && password == USERS[username]
    end
  end
end
