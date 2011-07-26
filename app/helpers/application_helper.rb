module ApplicationHelper
  def url_for_category(category)
    if category.sub_categories.size > 1
      category_sub_categories :category => category
    elsif category.sub_categories.size == 1
      sub_category_furniture_index_path :sub_category => category.sub_categories.first
    else
      category_furniture_index_path(:category_id => category)
    end
  end
  
  def sub_menu_items(category)
    category.sub_categories.map do |sc|
      {
        :key => sc.key,
        :name => sc.name,
        :url => sub_category_furniture_index_path( :sub_category => sc )
      }
    end
  end
  
  def menu_items
    categories = Category.all
    result = []
    
    result = categories.map do |category|
      {
        :name => category.name,
        :key => category.key,
        :url => url_for_category(category)
        # :items => sub_menu_items(category)
      }
    end
    
    debugger
    result
  end
end
