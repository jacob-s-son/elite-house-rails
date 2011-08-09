class ApplicationController < ActionController::Base
  protect_from_forgery
  before_filter :set_locale
  before_filter :authenticate
  before_filter :under_development
  
  private
  
  def set_locale
    I18n.locale = params[:locale] if params[:locale] && params[:locale].match(/lv|ru/)
  end
  
  def default_url_options(options={})
    {:locale => I18n.locale}
  end
  
  def authenticate
    if RAILS_ENV == "production_test"
      authenticate_or_request_with_http_basic do |username, password|
        username == USERS.keys.first && password == USERS[username]
      end
    end
  end
  
  def under_development
    if RAILS_ENV == "production" && params[:action] != "under_construction"
      redirect_to under_construction_path
    end
  end
end
