class ApplicationController < ActionController::Base
  protect_from_forgery
  USERS = { "admin" => "onl1-el1te-h0use-stuff" }
  
  private
  
  def authenticate
    authenticate_or_request_with_http_digest do |username|
      USERS[username]
    end
  end
end
