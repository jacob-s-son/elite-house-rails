class ApplicationController < ActionController::Base
  protect_from_forgery
  before_filter :set_locale
  before_filter { |c| c.authenticate if RAILS_ENV == "production_test" }
  
  private
  
  def set_locale
    I18n.locale = params[:locale] if params[:locale] && params[:locale].match(/lv|ru/)
  end
  
  def default_url_options(options={})
    {:locale => I18n.locale}
  end
  
  def authenticate
    authenticate_or_request_with_http_basic do |username, password|
      username == USERS.keys.first && password == USERS[username]
    end
  end
end
