class Admin::BaseController < ApplicationController
  layout 'admin/application'
  USERS = { "admin" => "onl1-el1te-h0use-stuff" }
  # before_filter :authenticate
  
  private
  def authenticate
    authenticate_or_request_with_http_digest do |username|
      USERS[username]
    end
  end
end
