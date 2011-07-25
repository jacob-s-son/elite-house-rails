class FurnitureController < ApplicationController
  before_filter :authenticate, :except => [:show, :index]
end
