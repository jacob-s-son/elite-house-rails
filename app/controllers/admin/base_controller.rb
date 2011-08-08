class Admin::BaseController < ApplicationController
  layout 'admin/application'
  USERS = { "admin" => "onl1-el1te-h0use-stuff" }
  before_filter :authenticate
  
  def admin_actions
    render "admin_actions"
  end
  
  private
  def authenticate
    # debugger
    authenticate_or_request_with_http_basic do |username, password|
      username == USERS.keys.first && password == USERS[username]
    end
  end
end
