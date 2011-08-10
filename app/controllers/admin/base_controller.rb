class Admin::BaseController < ApplicationController
  layout 'admin/application'
  before_filter :authenticate_admin
  
  def admin_actions
    render "admin_actions"
  end
  
  private
  def authenticate_admin
    if RAILS_ENV == "production"
      authenticate_or_request_with_http_basic do |username, password|
        username == USERS.keys.first && password == USERS[username]
      end
    end
  end
end
