class Category < ActiveRecord::Base
  has_many :sub_categories, :dependent => :destroy
  has_many :furniture, :dependent => :destroy
  after_initialize :set_defaults
  
  scope :active, where( "active = 't'" )
  
  def name
    read_attribute( I18n.locale == :lv ? :name : :name_ru ) 
  end
  
  def description
    read_attribute( I18n.locale == :lv ? :description : :description_ru ) 
  end
  
  def special?
    special
  end
  
  def dining_room?
    read_attribute(:name).match /Ēdamistaba/
  end
  
  def guest_room?
    read_attribute(:name).match /Viesistaba/
  end
  
  private
  
  def set_defaults
    self.priority = Category.count if priority.nil?
    self.active   = true if active.nil?
    self.special  = false if id.nil? && special.nil?
  end
end
